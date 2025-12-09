/**
 * WhatsApp Web Bulk Message Automation Script
 * 
 * HOW TO USE:
 * 1. Open WhatsApp Web (web.whatsapp.com) in Chrome/Firefox
 * 2. Open Browser Console (F12 > Console tab)
 * 3. Copy and paste the messages array from the downloaded file
 * 4. Copy and paste this entire script
 * 5. Press Enter and watch it send automatically
 * 
 * IMPORTANT: 
 * - Keep WhatsApp Web tab active and focused
 * - Don't minimize or switch tabs during sending
 * - Script respects 5-second delay between messages to avoid spam detection
 */

// STEP 1: Paste your messages array here
// Example format:
const messages = [
  {
    phone: "923001234567",
    name: "Customer Name",
    message: "Hello!\n\nYour order #12345..."
  }
  // Add more messages...
];

// STEP 2: Run the automation
async function sendWhatsAppMessages() {
  console.log(`🚀 Starting to send ${messages.length} messages...`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\n📤 [${i + 1}/${messages.length}] Sending to ${msg.name} (+${msg.phone})...`);
    
    try {
      // Open WhatsApp chat
      const url = `https://web.whatsapp.com/send?phone=${msg.phone}&text=${encodeURIComponent(msg.message)}`;
      window.open(url, '_blank');
      
      // Wait for chat to open and load
      await sleep(8000);
      
      // Try to find and click the send button
      // WhatsApp Web's send button selector (may change)
      const sendButton = document.querySelector('button[aria-label="Send"]') || 
                        document.querySelector('span[data-icon="send"]')?.parentElement;
      
      if (sendButton) {
        sendButton.click();
        console.log(`✅ Sent to ${msg.name}`);
        successCount++;
      } else {
        console.log(`⚠️  Could not auto-send to ${msg.name} - please send manually`);
        failCount++;
      }
      
      // Wait between messages to avoid spam detection
      if (i < messages.length - 1) {
        console.log('⏳ Waiting 5 seconds before next message...');
        await sleep(5000);
      }
      
    } catch (error) {
      console.error(`❌ Error sending to ${msg.name}:`, error);
      failCount++;
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log(`📊 Total: ${messages.length}`);
  console.log('='.repeat(50));
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Confirmation before running
if (messages.length > 0) {
  console.log(`📋 Loaded ${messages.length} messages`);
  console.log('⚠️  Make sure WhatsApp Web is open and logged in!');
  console.log('▶️  Type: sendWhatsAppMessages() to start');
} else {
  console.error('❌ No messages found! Please paste the messages array first.');
}

// Uncomment the line below to auto-start (use with caution!)
// sendWhatsAppMessages();
