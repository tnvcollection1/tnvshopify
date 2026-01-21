/**
 * Stories Section - Instagram/Namshi Style
 * Displays stories at top of homepage
 */
import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Play, Pause, Plus, Volume2, VolumeX } from 'lucide-react';

const API_URL = process.env.REACT_APP_BACKEND_URL;

// Progress bar component
const StoryProgress = ({ isActive, isPast, duration = 5000 }) => {
  return (
    <div className="flex-1 h-1 bg-white/30 rounded-full overflow-hidden">
      <div 
        className={`h-full bg-white rounded-full ${isActive ? 'animate-story-progress' : ''}`}
        style={{ 
          width: isPast ? '100%' : isActive ? '100%' : '0%',
          animationDuration: `${duration}ms`
        }}
      />
    </div>
  );
};

const StoriesSection = ({ stories = [], onAddStory }) => {
  const [selectedStoryIndex, setSelectedStoryIndex] = useState(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [progress, setProgress] = useState(0);

  // Mock stories if none provided
  const displayStories = stories.length > 0 ? stories : [
    {
      id: '1',
      username: 'TNV Official',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop',
      isOfficial: true,
      slides: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=800&h=1200&fit=crop', caption: 'New Collection Drop! 🔥' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=800&h=1200&fit=crop', caption: 'Summer Vibes ☀️' },
      ],
    },
    {
      id: '2',
      username: 'Fashion Week',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
      isNew: true,
      slides: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=800&h=1200&fit=crop', caption: 'Runway looks 💫' },
      ],
    },
    {
      id: '3',
      username: 'Street Style',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop',
      slides: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1552374196-1ab2a1c593e8?w=800&h=1200&fit=crop', caption: 'Urban vibes 🏙️' },
        { type: 'image', url: 'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800&h=1200&fit=crop', caption: 'Sneaker game strong 👟' },
      ],
    },
    {
      id: '4',
      username: 'Sale Alert',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop',
      isNew: true,
      slides: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&h=1200&fit=crop', caption: '50% OFF Everything! 🛍️' },
      ],
    },
    {
      id: '5',
      username: 'Beauty Tips',
      avatar: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=100&h=100&fit=crop',
      slides: [
        { type: 'image', url: 'https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?w=800&h=1200&fit=crop', caption: 'Glow up season ✨' },
      ],
    },
  ];

  // Auto-advance stories
  useEffect(() => {
    if (selectedStoryIndex === null || isPaused) return;

    const currentStory = displayStories[selectedStoryIndex];
    const timer = setTimeout(() => {
      if (currentSlideIndex < currentStory.slides.length - 1) {
        setCurrentSlideIndex(prev => prev + 1);
      } else if (selectedStoryIndex < displayStories.length - 1) {
        setSelectedStoryIndex(prev => prev + 1);
        setCurrentSlideIndex(0);
      } else {
        setSelectedStoryIndex(null);
        setCurrentSlideIndex(0);
      }
    }, 5000);

    return () => clearTimeout(timer);
  }, [selectedStoryIndex, currentSlideIndex, isPaused, displayStories]);

  const openStory = (index) => {
    setSelectedStoryIndex(index);
    setCurrentSlideIndex(0);
  };

  const closeStory = () => {
    setSelectedStoryIndex(null);
    setCurrentSlideIndex(0);
  };

  const goToPrevStory = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(prev => prev - 1);
    } else if (selectedStoryIndex > 0) {
      setSelectedStoryIndex(prev => prev - 1);
      setCurrentSlideIndex(displayStories[selectedStoryIndex - 1].slides.length - 1);
    }
  };

  const goToNextStory = () => {
    const currentStory = displayStories[selectedStoryIndex];
    if (currentSlideIndex < currentStory.slides.length - 1) {
      setCurrentSlideIndex(prev => prev + 1);
    } else if (selectedStoryIndex < displayStories.length - 1) {
      setSelectedStoryIndex(prev => prev + 1);
      setCurrentSlideIndex(0);
    } else {
      closeStory();
    }
  };

  return (
    <>
      {/* Stories Row */}
      <div className="py-3 bg-white border-b" data-testid="stories-section">
        <div className="flex gap-3 px-3 overflow-x-auto scrollbar-hide">
          {/* Add Story Button (for logged in users) */}
          {onAddStory && (
            <button 
              onClick={onAddStory}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center border-2 border-dashed border-gray-300">
                <Plus className="w-6 h-6 text-gray-400" />
              </div>
              <span className="text-[10px] mt-1 text-gray-500">Add Story</span>
            </button>
          )}

          {/* Story Avatars */}
          {displayStories.map((story, index) => (
            <button
              key={story.id}
              onClick={() => openStory(index)}
              className="flex-shrink-0 flex flex-col items-center"
            >
              <div className={`w-16 h-16 rounded-full p-[2px] ${
                story.isNew 
                  ? 'bg-gradient-to-br from-pink-500 via-red-500 to-yellow-500' 
                  : story.isOfficial 
                    ? 'bg-gradient-to-br from-blue-500 to-purple-500'
                    : 'bg-gray-300'
              }`}>
                <div className="w-full h-full rounded-full border-2 border-white overflow-hidden">
                  <img 
                    src={story.avatar} 
                    alt={story.username}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              <span className="text-[10px] mt-1 text-gray-700 max-w-[64px] truncate">
                {story.username}
              </span>
              {story.isOfficial && (
                <span className="text-[8px] text-blue-500">✓ Official</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Full Screen Story Viewer */}
      {selectedStoryIndex !== null && (
        <div 
          className="fixed inset-0 z-[9999] bg-black" 
          data-testid="story-viewer"
          onClick={(e) => {
            // Close if clicking outside content
            if (e.target === e.currentTarget) closeStory();
          }}
        >
          {/* Story Content */}
          <div className="relative h-full flex items-center justify-center">
            {/* Current Slide */}
            <img
              src={displayStories[selectedStoryIndex].slides[currentSlideIndex].url}
              alt=""
              className="max-h-full max-w-full object-contain"
            />

            {/* Gradient Overlays */}
            <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-black/60 to-transparent pointer-events-none" />
            <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

            {/* Progress Bars */}
            <div className="absolute top-4 left-4 right-4 flex gap-1 pointer-events-none">
              {displayStories[selectedStoryIndex].slides.map((_, idx) => (
                <StoryProgress 
                  key={idx}
                  isActive={idx === currentSlideIndex}
                  isPast={idx < currentSlideIndex}
                />
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-10 left-4 right-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white">
                  <img 
                    src={displayStories[selectedStoryIndex].avatar}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">
                    {displayStories[selectedStoryIndex].username}
                  </p>
                  <p className="text-white/60 text-xs">2h ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setIsPaused(!isPaused)}
                  className="text-white p-2 hover:bg-white/20 rounded-full transition"
                >
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </button>
                <button 
                  onClick={() => setIsMuted(!isMuted)}
                  className="text-white p-2 hover:bg-white/20 rounded-full transition"
                >
                  {isMuted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                </button>
                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    closeStory();
                  }}
                  className="text-white p-2 hover:bg-white/20 rounded-full transition"
                  data-testid="close-story-btn"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Caption */}
            {displayStories[selectedStoryIndex].slides[currentSlideIndex].caption && (
              <div className="absolute bottom-20 left-4 right-4 pointer-events-none">
                <p className="text-white text-center text-lg font-medium drop-shadow-lg">
                  {displayStories[selectedStoryIndex].slides[currentSlideIndex].caption}
                </p>
              </div>
            )}

            {/* Navigation Areas */}
            <button 
              onClick={goToPrevStory}
              className="absolute left-0 top-0 bottom-0 w-1/3 cursor-pointer"
              aria-label="Previous"
            />
            <button 
              onClick={goToNextStory}
              className="absolute right-0 top-0 bottom-0 w-1/3 cursor-pointer"
              aria-label="Next"
            />

            {/* Side Navigation Arrows (Desktop) */}
            <button 
              onClick={goToPrevStory}
              className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center hidden md:flex hover:bg-white/30 transition"
            >
              <ChevronLeft className="w-6 h-6 text-white" />
            </button>
            <button 
              onClick={goToNextStory}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/20 rounded-full items-center justify-center hidden md:flex hover:bg-white/30 transition"
            >
              <ChevronRight className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      )}

      {/* CSS for story progress animation */}
      <style>{`
        @keyframes story-progress {
          from { width: 0%; }
          to { width: 100%; }
        }
        .animate-story-progress {
          animation: story-progress linear forwards;
        }
      `}</style>
    </>
  );
};

export default StoriesSection;
