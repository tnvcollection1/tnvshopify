"""
Inventory Management Module
Handles stock tracking, auto-deduction on delivery, and inventory operations
"""
import logging
from typing import Dict, Optional, List
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class InventoryManager:
    """Manages inventory operations and stock tracking"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def set_opening_stock(self, sku: str, product_name: str, opening_stock: int, reorder_level: int = 5) -> Dict:
        """
        Set opening stock for a product
        
        Args:
            sku: Product SKU
            product_name: Product name/description
            opening_stock: Initial stock quantity
            reorder_level: Minimum stock before alert
            
        Returns:
            Dict with success status
        """
        try:
            existing = await self.db.inventory.find_one({"sku": sku.upper()}, {"_id": 0})
            
            if existing:
                # Update existing product
                await self.db.inventory.update_one(
                    {"sku": sku.upper()},
                    {"$set": {
                        "product_name": product_name,
                        "opening_stock": opening_stock,
                        "current_stock": opening_stock,  # Reset current stock to opening
                        "reorder_level": reorder_level,
                        "updated_at": datetime.now(timezone.utc).isoformat()
                    }}
                )
                logger.info(f"Updated inventory for SKU: {sku}")
                return {"success": True, "message": "Inventory updated", "sku": sku}
            else:
                # Create new inventory item
                inventory_item = {
                    "sku": sku.upper(),
                    "product_name": product_name,
                    "opening_stock": opening_stock,
                    "current_stock": opening_stock,
                    "sold_quantity": 0,
                    "reorder_level": reorder_level,
                    "created_at": datetime.now(timezone.utc).isoformat(),
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
                await self.db.inventory.insert_one(inventory_item)
                logger.info(f"Created inventory for SKU: {sku}")
                return {"success": True, "message": "Inventory created", "sku": sku}
                
        except Exception as e:
            logger.error(f"Error setting opening stock for {sku}: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def deduct_stock_on_delivery(self, order_skus: List[str], customer_id: str, order_number: str) -> Dict:
        """
        Deduct stock when order is DELIVERED
        Called automatically when delivery_status changes to DELIVERED
        
        Args:
            order_skus: List of SKUs in the order
            customer_id: Customer ID for logging
            order_number: Order number for tracking
            
        Returns:
            Dict with deduction results
        """
        try:
            deducted = []
            not_found = []
            
            for sku in order_skus:
                sku_upper = sku.upper()
                
                # Find inventory item
                inventory_item = await self.db.inventory.find_one({"sku": sku_upper}, {"_id": 0})
                
                if inventory_item:
                    current_stock = inventory_item.get('current_stock', 0)
                    
                    if current_stock > 0:
                        # Deduct 1 unit
                        new_stock = current_stock - 1
                        sold_qty = inventory_item.get('sold_quantity', 0) + 1
                        
                        await self.db.inventory.update_one(
                            {"sku": sku_upper},
                            {"$set": {
                                "current_stock": new_stock,
                                "sold_quantity": sold_qty,
                                "last_sale_date": datetime.now(timezone.utc).isoformat(),
                                "updated_at": datetime.now(timezone.utc).isoformat()
                            }}
                        )
                        
                        # Log the transaction
                        await self.db.inventory_transactions.insert_one({
                            "sku": sku_upper,
                            "type": "SALE",
                            "quantity": -1,
                            "order_number": order_number,
                            "customer_id": customer_id,
                            "stock_before": current_stock,
                            "stock_after": new_stock,
                            "timestamp": datetime.now(timezone.utc).isoformat()
                        })
                        
                        deducted.append({"sku": sku, "new_stock": new_stock})
                        logger.info(f"Deducted stock for {sku}: {current_stock} → {new_stock}")
                    else:
                        logger.warning(f"No stock available for {sku}")
                        deducted.append({"sku": sku, "new_stock": 0, "warning": "Out of stock"})
                else:
                    not_found.append(sku)
                    logger.warning(f"SKU not found in inventory: {sku}")
            
            return {
                "success": True,
                "deducted": deducted,
                "not_found": not_found,
                "order_number": order_number
            }
            
        except Exception as e:
            logger.error(f"Error deducting stock: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def adjust_stock(self, sku: str, adjustment: int, reason: str, user: str = "system") -> Dict:
        """
        Manual stock adjustment
        
        Args:
            sku: Product SKU
            adjustment: Quantity to add (positive) or remove (negative)
            reason: Reason for adjustment (e.g., "Damaged", "Found", "Correction")
            user: Who made the adjustment
            
        Returns:
            Dict with adjustment result
        """
        try:
            sku_upper = sku.upper()
            inventory_item = await self.db.inventory.find_one({"sku": sku_upper}, {"_id": 0})
            
            if not inventory_item:
                return {"success": False, "error": "SKU not found"}
            
            current_stock = inventory_item.get('current_stock', 0)
            new_stock = max(0, current_stock + adjustment)  # Can't go below 0
            
            await self.db.inventory.update_one(
                {"sku": sku_upper},
                {"$set": {
                    "current_stock": new_stock,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            # Log the adjustment
            await self.db.inventory_transactions.insert_one({
                "sku": sku_upper,
                "type": "ADJUSTMENT",
                "quantity": adjustment,
                "reason": reason,
                "user": user,
                "stock_before": current_stock,
                "stock_after": new_stock,
                "timestamp": datetime.now(timezone.utc).isoformat()
            })
            
            logger.info(f"Adjusted stock for {sku}: {current_stock} → {new_stock} (reason: {reason})")
            
            return {
                "success": True,
                "sku": sku,
                "stock_before": current_stock,
                "stock_after": new_stock,
                "adjustment": adjustment
            }
            
        except Exception as e:
            logger.error(f"Error adjusting stock: {str(e)}")
            return {"success": False, "error": str(e)}
    
    async def get_inventory_stats(self) -> Dict:
        """
        Get inventory statistics
        
        Returns:
            Dict with inventory stats
        """
        try:
            total_skus = await self.db.inventory.count_documents({})
            
            # Get all inventory items
            inventory_items = await self.db.inventory.find({}, {"_id": 0}).to_list(10000)
            
            total_stock = sum(item.get('current_stock', 0) for item in inventory_items)
            low_stock = sum(1 for item in inventory_items if 0 < item.get('current_stock', 0) <= item.get('reorder_level', 5))
            out_of_stock = sum(1 for item in inventory_items if item.get('current_stock', 0) == 0)
            
            return {
                "totalSKUs": total_skus,
                "totalStock": total_stock,
                "lowStock": low_stock,
                "outOfStock": out_of_stock
            }
            
        except Exception as e:
            logger.error(f"Error getting inventory stats: {str(e)}")
            return {
                "totalSKUs": 0,
                "totalStock": 0,
                "lowStock": 0,
                "outOfStock": 0
            }
    
    async def get_stock_history(self, sku: str, limit: int = 50) -> List[Dict]:
        """
        Get stock transaction history for a SKU
        
        Args:
            sku: Product SKU
            limit: Maximum number of transactions to return
            
        Returns:
            List of transaction records
        """
        try:
            sku_upper = sku.upper()
            
            transactions = await self.db.inventory_transactions.find(
                {"sku": sku_upper},
                {"_id": 0}
            ).sort("timestamp", -1).limit(limit).to_list(limit)
            
            return transactions
            
        except Exception as e:
            logger.error(f"Error getting stock history: {str(e)}")
            return []
