import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Grid, LayoutGrid, Search } from 'lucide-react';
import { useStore } from './MrPorterLayout';
import { getApiUrl } from '../config/storeConfig';

const API = import.meta.env.VITE_API_URL || getApiUrl();

const CollectionsPage = () => {
  const storeConfig = useStore();
  const [searchParams] = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [activeFilter, setActiveFilter] = useState('all');

  const storeSlug = storeConfig?.id || 'tnvcollectionpk';

  useEffect(() => {
    fetchCollections();
  }, [storeSlug]);

  const fetchCollections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/storefront/collections?store=${storeSlug}`);
      if (res.ok) {
        const data = await res.json();
        setCollections(data.collections || []);
      }
    } catch (e) {
      console.error('Failed to fetch collections:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter collections based on search and type
  const filteredCollections = collections.filter(collection => {
    const matchesSearch = collection.title?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = activeFilter === 'all' || collection.collection_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // Get unique collection types for filter
  const collectionTypes = [...new Set(collections.map(c => c.collection_type))].filter(Boolean);

  if (loading) {
    return (
      <div className="min-h-screen bg-white" data-testid="collections-loading">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 py-12">
          {/* Header Skeleton */}
          <div className="text-center mb-12">
            <div className="h-8 bg-gray-100 w-48 mx-auto mb-4 animate-pulse" />
            <div className="h-4 bg-gray-100 w-96 mx-auto animate-pulse" />
          </div>
          
          {/* Grid Skeleton */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-square bg-gray-100 mb-3" />
                <div className="h-4 bg-gray-100 w-3/4 mb-2" />
                <div className="h-3 bg-gray-100 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" data-testid="collections-page">
      {/* Hero Section */}
      <section className="bg-black text-white py-16 md:py-24">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 text-center">
          <p className="text-xs tracking-[0.3em] text-gray-400 mb-4">EXPLORE OUR</p>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-light tracking-wide mb-6">
            Collections
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Discover our carefully curated collections, each telling its own unique story of style and sophistication.
          </p>
        </div>
      </section>

      {/* Filters & Search */}
      <section className="border-b border-gray-100 sticky top-[60px] bg-white z-20">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-4">
            {/* Search */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search collections..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 text-sm focus:outline-none focus:border-black transition"
                data-testid="collection-search"
              />
            </div>

            {/* Filters & View Toggle */}
            <div className="flex items-center gap-4">
              {/* Type Filters */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveFilter('all')}
                  className={`px-4 py-2 text-xs tracking-wider uppercase transition ${
                    activeFilter === 'all' 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  All ({collections.length})
                </button>
                {collectionTypes.map(type => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(type)}
                    className={`px-4 py-2 text-xs tracking-wider uppercase transition ${
                      activeFilter === type 
                        ? 'bg-black text-white' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              {/* View Toggle */}
              <div className="flex border border-gray-200">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 transition ${viewMode === 'grid' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 transition ${viewMode === 'list' ? 'bg-black text-white' : 'hover:bg-gray-100'}`}
                  aria-label="List view"
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Collections Grid/List */}
      <section className="py-12 md:py-16">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8">
          {filteredCollections.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-gray-500 text-lg">No collections found</p>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="mt-4 text-sm underline hover:no-underline"
                >
                  Clear search
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            <div 
              className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6"
              data-testid="collections-grid"
            >
              {filteredCollections.map((collection) => (
                <CollectionCard key={collection.shopify_collection_id} collection={collection} />
              ))}
            </div>
          ) : (
            <div className="space-y-4" data-testid="collections-list">
              {filteredCollections.map((collection) => (
                <CollectionListItem key={collection.shopify_collection_id} collection={collection} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Results Count */}
      <section className="pb-16">
        <div className="max-w-[1440px] mx-auto px-4 lg:px-8 text-center">
          <p className="text-sm text-gray-500">
            Showing {filteredCollections.length} of {collections.length} collections
          </p>
        </div>
      </section>
    </div>
  );
};

// Collection Card Component (Grid View)
const CollectionCard = ({ collection }) => {
  const [imageError, setImageError] = useState(false);
  
  // Use collection image or a placeholder
  const imageUrl = collection.image_url || 
    `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80`;

  return (
    <Link
      to={`/products?collection=${collection.handle}`}
      className="group block"
      data-testid={`collection-card-${collection.handle}`}
    >
      {/* Image */}
      <div className="aspect-square bg-[#f5f5f5] overflow-hidden mb-4 relative">
        <img
          src={imageError ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80' : imageUrl}
          alt={collection.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Overlay on Hover */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-white text-black px-6 py-3 text-xs tracking-[0.15em] uppercase">
            View Collection
          </span>
        </div>

        {/* Collection Type Badge */}
        {collection.collection_type && (
          <span className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[10px] tracking-wider uppercase px-2 py-1">
            {collection.collection_type}
          </span>
        )}
      </div>

      {/* Info */}
      <div className="space-y-1">
        <h3 className="text-sm font-medium text-black group-hover:underline line-clamp-2">
          {collection.title}
        </h3>
        {collection.body_html && (
          <p className="text-xs text-gray-500 line-clamp-2" 
             dangerouslySetInnerHTML={{ __html: collection.body_html.replace(/<[^>]*>/g, '').substring(0, 80) + '...' }} 
          />
        )}
      </div>
    </Link>
  );
};

// Collection List Item Component (List View)
const CollectionListItem = ({ collection }) => {
  const [imageError, setImageError] = useState(false);
  
  const imageUrl = collection.image_url || 
    `https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80`;

  return (
    <Link
      to={`/products?collection=${collection.handle}`}
      className="group flex gap-6 p-4 border border-gray-100 hover:border-black transition-colors"
      data-testid={`collection-list-${collection.handle}`}
    >
      {/* Image */}
      <div className="w-32 h-32 md:w-48 md:h-48 flex-shrink-0 bg-[#f5f5f5] overflow-hidden">
        <img
          src={imageError ? 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=600&q=80' : imageUrl}
          alt={collection.title}
          onError={() => setImageError(true)}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>

      {/* Info */}
      <div className="flex-1 flex flex-col justify-center">
        {collection.collection_type && (
          <span className="text-[10px] tracking-[0.2em] uppercase text-gray-500 mb-2">
            {collection.collection_type} Collection
          </span>
        )}
        <h3 className="text-lg md:text-xl font-light text-black group-hover:underline mb-2">
          {collection.title}
        </h3>
        {collection.body_html && (
          <p className="text-sm text-gray-500 line-clamp-2 mb-4" 
             dangerouslySetInnerHTML={{ __html: collection.body_html.replace(/<[^>]*>/g, '').substring(0, 150) + '...' }} 
          />
        )}
        <span className="inline-flex items-center gap-2 text-xs tracking-[0.15em] uppercase text-black group-hover:gap-3 transition-all">
          Shop Now <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  );
};

export default CollectionsPage;
