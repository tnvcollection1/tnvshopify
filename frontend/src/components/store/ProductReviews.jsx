import React, { useState, useEffect } from 'react';
import { Star, ThumbsUp, ThumbsDown, ChevronDown, Camera, Check, X, Filter } from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.REACT_APP_BACKEND_URL || '';

// Star Rating Component
const StarRating = ({ rating, size = 'md', interactive = false, onRate = () => {} }) => {
  const [hoverRating, setHoverRating] = useState(0);
  const sizeClasses = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-6 h-6' };
  
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={!interactive}
          onMouseEnter={() => interactive && setHoverRating(star)}
          onMouseLeave={() => interactive && setHoverRating(0)}
          onClick={() => interactive && onRate(star)}
          className={`${interactive ? 'cursor-pointer' : 'cursor-default'}`}
        >
          <Star
            className={`${sizeClasses[size]} ${
              star <= (hoverRating || rating) 
                ? 'text-yellow-400 fill-yellow-400' 
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
};

// Rating Summary Bar
const RatingBar = ({ stars, count, total }) => {
  const percentage = total > 0 ? (count / total) * 100 : 0;
  
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="w-12 text-gray-600">{stars} star</span>
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div 
          className="h-full bg-yellow-400 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="w-8 text-gray-500 text-right">{count}</span>
    </div>
  );
};

// Single Review Card
const ReviewCard = ({ review, onHelpful, customerId }) => {
  const [voted, setVoted] = useState(false);
  
  const handleVote = async (helpful) => {
    if (voted) return;
    
    try {
      const res = await fetch(`${API}/api/ecommerce/reviews/${review.id}/helpful?customer_id=${customerId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ helpful })
      });
      
      if (res.ok) {
        setVoted(true);
        toast.success('Thanks for your feedback!');
        if (onHelpful) onHelpful(review.id, helpful);
      }
    } catch (e) {
      toast.error('Failed to submit feedback');
    }
  };
  
  return (
    <div className="border-b pb-6 mb-6 last:border-0" data-testid="review-card">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StarRating rating={review.rating} size="sm" />
            {review.verified_purchase && (
              <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verified Purchase
              </span>
            )}
          </div>
          {review.title && (
            <h4 className="font-semibold">{review.title}</h4>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {new Date(review.created_at).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
          })}
        </span>
      </div>
      
      <p className="text-gray-700 mb-4">{review.content}</p>
      
      {/* Pros and Cons */}
      {(review.pros?.length > 0 || review.cons?.length > 0) && (
        <div className="grid md:grid-cols-2 gap-4 mb-4">
          {review.pros?.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-green-700 mb-2">PROS</p>
              <ul className="text-sm space-y-1">
                {review.pros.map((pro, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <Check className="w-3 h-3 text-green-600" />
                    {pro}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {review.cons?.length > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs font-medium text-red-700 mb-2">CONS</p>
              <ul className="text-sm space-y-1">
                {review.cons.map((con, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <X className="w-3 h-3 text-red-600" />
                    {con}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Review Images */}
      {review.images?.length > 0 && (
        <div className="flex gap-2 mb-4">
          {review.images.map((img, i) => (
            <img 
              key={i}
              src={img}
              alt={`Review image ${i + 1}`}
              className="w-16 h-16 object-cover rounded-lg cursor-pointer hover:opacity-80"
            />
          ))}
        </div>
      )}
      
      {/* Helpful Buttons */}
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-500">Was this helpful?</span>
        <button
          onClick={() => handleVote(true)}
          disabled={voted}
          className={`flex items-center gap-1 text-sm ${
            voted ? 'text-gray-400' : 'text-gray-600 hover:text-green-600'
          }`}
          data-testid="review-helpful-btn"
        >
          <ThumbsUp className="w-4 h-4" />
          {review.helpful_count || 0}
        </button>
        <button
          onClick={() => handleVote(false)}
          disabled={voted}
          className={`flex items-center gap-1 text-sm ${
            voted ? 'text-gray-400' : 'text-gray-600 hover:text-red-600'
          }`}
        >
          <ThumbsDown className="w-4 h-4" />
          {review.unhelpful_count || 0}
        </button>
      </div>
    </div>
  );
};

// Write Review Modal
const WriteReviewModal = ({ productId, storeName, customerId, onClose, onSubmit }) => {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [pros, setPros] = useState(['']);
  const [cons, setCons] = useState(['']);
  const [submitting, setSubmitting] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    if (!content.trim()) {
      toast.error('Please write your review');
      return;
    }
    
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/api/ecommerce/reviews?customer_id=${customerId}&store=${storeName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: productId,
          rating,
          title: title.trim() || null,
          content: content.trim(),
          images: [],
          pros: pros.filter(p => p.trim()),
          cons: cons.filter(c => c.trim())
        })
      });
      
      if (res.ok) {
        toast.success('Review submitted! It will appear after moderation.');
        onSubmit();
        onClose();
      } else {
        const data = await res.json();
        toast.error(data.detail || 'Failed to submit review');
      }
    } catch (e) {
      toast.error('Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };
  
  const addListItem = (setter, current) => {
    if (current.length < 5) {
      setter([...current, '']);
    }
  };
  
  const updateListItem = (setter, current, index, value) => {
    const updated = [...current];
    updated[index] = value;
    setter(updated);
  };
  
  const removeListItem = (setter, current, index) => {
    if (current.length > 1) {
      setter(current.filter((_, i) => i !== index));
    } else {
      setter(['']);
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b sticky top-0 bg-white">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold">Write a Review</h3>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Rating *</label>
            <StarRating rating={rating} size="lg" interactive onRate={setRating} />
          </div>
          
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">Review Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Summarize your experience"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black"
              maxLength={100}
            />
          </div>
          
          {/* Content */}
          <div>
            <label className="block text-sm font-medium mb-2">Your Review *</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your experience with this product..."
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-black h-32 resize-none"
              maxLength={1000}
              required
            />
            <p className="text-xs text-gray-400 mt-1">{content.length}/1000</p>
          </div>
          
          {/* Pros */}
          <div>
            <label className="block text-sm font-medium mb-2">Pros (Optional)</label>
            {pros.map((pro, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={pro}
                  onChange={(e) => updateListItem(setPros, pros, i, e.target.value)}
                  placeholder="What did you like?"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(setPros, pros, i)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {pros.length < 5 && (
              <button
                type="button"
                onClick={() => addListItem(setPros, pros)}
                className="text-sm text-green-600 hover:underline"
              >
                + Add another pro
              </button>
            )}
          </div>
          
          {/* Cons */}
          <div>
            <label className="block text-sm font-medium mb-2">Cons (Optional)</label>
            {cons.map((con, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={con}
                  onChange={(e) => updateListItem(setCons, cons, i, e.target.value)}
                  placeholder="What could be improved?"
                  className="flex-1 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                />
                <button
                  type="button"
                  onClick={() => removeListItem(setCons, cons, i)}
                  className="p-2 text-gray-400 hover:text-red-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            {cons.length < 5 && (
              <button
                type="button"
                onClick={() => addListItem(setCons, cons)}
                className="text-sm text-red-600 hover:underline"
              >
                + Add another con
              </button>
            )}
          </div>
          
          {/* Submit */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 border-2 rounded-xl font-medium hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || rating === 0 || !content.trim()}
              className="flex-1 py-3 bg-black text-white rounded-xl font-medium hover:bg-gray-800 disabled:opacity-50"
              data-testid="submit-review-btn"
            >
              {submitting ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Main Product Reviews Component
const ProductReviews = ({ productId, storeName = 'tnvcollection' }) => {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [filterRating, setFilterRating] = useState(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  const customerId = (() => {
    let id = localStorage.getItem('customer_id');
    if (!id) {
      id = 'cust_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
      localStorage.setItem('customer_id', id);
    }
    return id;
  })();
  
  useEffect(() => {
    fetchReviews();
  }, [productId, sortBy, filterRating, verifiedOnly, page]);
  
  const fetchReviews = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        store: storeName,
        sort: sortBy,
        page: page.toString(),
        limit: '10'
      });
      if (filterRating) params.append('rating_filter', filterRating.toString());
      if (verifiedOnly) params.append('verified_only', 'true');
      
      const res = await fetch(`${API}/api/ecommerce/reviews/product/${productId}?${params}`);
      const data = await res.json();
      
      setReviews(data.reviews || []);
      setStats(data.stats);
      setTotalPages(data.pages || 1);
    } catch (e) {
      console.error('Failed to fetch reviews:', e);
    } finally {
      setLoading(false);
    }
  };
  
  const avgRating = stats?.avg_rating || 0;
  const totalReviews = stats?.total_reviews || 0;
  const distribution = stats?.rating_distribution || { '5': 0, '4': 0, '3': 0, '2': 0, '1': 0 };
  
  return (
    <div className="bg-white rounded-2xl shadow-sm p-6" data-testid="product-reviews">
      <h2 className="text-xl font-bold mb-6">Customer Reviews</h2>
      
      {/* Summary Section */}
      <div className="grid md:grid-cols-2 gap-8 mb-8 pb-8 border-b">
        {/* Average Rating */}
        <div className="text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-3 mb-2">
            <span className="text-5xl font-bold">{avgRating.toFixed(1)}</span>
            <div>
              <StarRating rating={Math.round(avgRating)} />
              <p className="text-sm text-gray-500 mt-1">
                Based on {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWriteReview(true)}
            className="mt-4 px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800"
            data-testid="write-review-btn"
          >
            Write a Review
          </button>
        </div>
        
        {/* Rating Distribution */}
        <div className="space-y-2">
          {[5, 4, 3, 2, 1].map((stars) => (
            <button
              key={stars}
              onClick={() => setFilterRating(filterRating === stars ? null : stars)}
              className={`w-full ${filterRating === stars ? 'opacity-100' : 'opacity-70 hover:opacity-100'}`}
            >
              <RatingBar 
                stars={stars} 
                count={distribution[stars.toString()] || 0}
                total={totalReviews}
              />
            </button>
          ))}
        </div>
      </div>
      
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-sm border rounded-lg px-3 py-2"
            data-testid="review-sort-select"
          >
            <option value="recent">Most Recent</option>
            <option value="helpful">Most Helpful</option>
            <option value="rating_high">Highest Rated</option>
            <option value="rating_low">Lowest Rated</option>
          </select>
        </div>
        
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(e) => setVerifiedOnly(e.target.checked)}
            className="rounded"
          />
          <span className="text-sm">Verified Purchases Only</span>
        </label>
        
        {filterRating && (
          <button
            onClick={() => setFilterRating(null)}
            className="text-sm text-blue-600 hover:underline"
          >
            Clear {filterRating}-star filter
          </button>
        )}
      </div>
      
      {/* Reviews List */}
      {loading ? (
        <div className="py-12 text-center text-gray-500">Loading reviews...</div>
      ) : reviews.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-gray-500 mb-4">No reviews yet. Be the first to review!</p>
          <button
            onClick={() => setShowWriteReview(true)}
            className="px-6 py-2 bg-black text-white rounded-full font-medium hover:bg-gray-800"
          >
            Write a Review
          </button>
        </div>
      ) : (
        <>
          {reviews.map((review) => (
            <ReviewCard 
              key={review.id} 
              review={review}
              customerId={customerId}
              onHelpful={() => fetchReviews()}
            />
          ))}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-6">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`px-4 py-2 rounded-lg ${
                    page === p 
                      ? 'bg-black text-white' 
                      : 'bg-gray-100 hover:bg-gray-200'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          )}
        </>
      )}
      
      {/* Write Review Modal */}
      {showWriteReview && (
        <WriteReviewModal
          productId={productId}
          storeName={storeName}
          customerId={customerId}
          onClose={() => setShowWriteReview(false)}
          onSubmit={fetchReviews}
        />
      )}
    </div>
  );
};

export default ProductReviews;
export { StarRating, ReviewCard };
