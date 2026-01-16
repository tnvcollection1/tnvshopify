/**
 * Stories Manager - Admin Dashboard
 * Create, edit, and manage stories for the storefront
 */
import React, { useState, useEffect } from 'react';
import { 
  Plus, Trash2, Edit3, Image, Video, Eye, Clock, 
  Upload, X, Save, ChevronLeft, Play, Pause, BarChart2,
  Check, AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';

const API_URL = process.env.REACT_APP_BACKEND_URL;

const StoriesManager = () => {
  const [stories, setStories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingStory, setEditingStory] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStore, setSelectedStore] = useState('tnvcollection');

  useEffect(() => {
    fetchStories();
  }, [selectedStore]);

  const fetchStories = async () => {
    try {
      const res = await fetch(`${API_URL}/api/stories?store=${selectedStore}`);
      const data = await res.json();
      if (data.success) {
        setStories(data.stories);
      }
    } catch (e) {
      console.error('Error fetching stories:', e);
      toast.error('Failed to load stories');
    } finally {
      setLoading(false);
    }
  };

  const deleteStory = async (storyId) => {
    if (!confirm('Are you sure you want to delete this story?')) return;
    
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success('Story deleted');
        fetchStories();
      } else {
        toast.error('Failed to delete story');
      }
    } catch (e) {
      toast.error('Error deleting story');
    }
  };

  const toggleStoryActive = async (storyId, isActive) => {
    try {
      const res = await fetch(`${API_URL}/api/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const data = await res.json();
      
      if (data.success) {
        toast.success(isActive ? 'Story deactivated' : 'Story activated');
        fetchStories();
      }
    } catch (e) {
      toast.error('Error updating story');
    }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Stories Manager</h1>
          <p className="text-gray-500">Create and manage Instagram-style stories</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedStore}
            onChange={(e) => setSelectedStore(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="tnvcollection">TNV Collection (India)</option>
            <option value="tnvcollectionpk">TNV Collection (Pakistan)</option>
          </select>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Story
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Image className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stories.length}</p>
              <p className="text-sm text-gray-500">Total Stories</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Check className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stories.filter(s => s.isActive).length}</p>
              <p className="text-sm text-gray-500">Active</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stories.reduce((sum, s) => sum + (s.views || 0), 0)}</p>
              <p className="text-sm text-gray-500">Total Views</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stories.filter(s => s.isNew).length}</p>
              <p className="text-sm text-gray-500">New (Unwatched)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stories Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      ) : stories.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-600">No stories yet</h3>
          <p className="text-gray-400 mb-4">Create your first story to engage customers</p>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Story
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {stories.map((story) => (
            <StoryCard 
              key={story.id} 
              story={story}
              onEdit={() => setEditingStory(story)}
              onDelete={() => deleteStory(story.id)}
              onToggleActive={() => toggleStoryActive(story.id, story.isActive)}
            />
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || editingStory) && (
        <StoryEditorModal
          story={editingStory}
          store={selectedStore}
          onClose={() => {
            setShowCreateModal(false);
            setEditingStory(null);
          }}
          onSave={() => {
            setShowCreateModal(false);
            setEditingStory(null);
            fetchStories();
          }}
        />
      )}
    </div>
  );
};

// Story Card Component
const StoryCard = ({ story, onEdit, onDelete, onToggleActive }) => {
  const firstSlide = story.slides?.[0];
  
  return (
    <div className="relative group">
      <div className={`aspect-[9/16] rounded-xl overflow-hidden border-2 ${
        story.isActive ? 'border-green-500' : 'border-gray-200'
      }`}>
        {firstSlide && (
          <img 
            src={firstSlide.url}
            alt={story.username}
            className="w-full h-full object-cover"
          />
        )}
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30" />
        
        {/* Avatar & Username */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <img 
            src={story.avatar}
            alt=""
            className="w-8 h-8 rounded-full border-2 border-white"
          />
          <span className="text-white text-sm font-medium truncate max-w-[80px]">
            {story.username}
          </span>
        </div>

        {/* Stats */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center justify-between text-white text-xs">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {story.views || 0}
            </span>
            <span className="flex items-center gap-1">
              <Image className="w-3 h-3" />
              {story.slides?.length || 0}
            </span>
          </div>
        </div>

        {/* Status Badge */}
        <div className={`absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold ${
          story.isActive ? 'bg-green-500 text-white' : 'bg-gray-500 text-white'
        }`}>
          {story.isActive ? 'LIVE' : 'INACTIVE'}
        </div>

        {/* Hover Actions */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
          <button 
            onClick={onEdit}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button 
            onClick={onToggleActive}
            className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-gray-100"
          >
            {story.isActive ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button 
            onClick={onDelete}
            className="w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// Story Editor Modal
const StoryEditorModal = ({ story, store, onClose, onSave }) => {
  const [username, setUsername] = useState(story?.username || 'TNV Official');
  const [avatar, setAvatar] = useState(story?.avatar || '');
  const [isOfficial, setIsOfficial] = useState(story?.isOfficial || false);
  const [slides, setSlides] = useState(story?.slides || []);
  const [saving, setSaving] = useState(false);

  const addSlide = () => {
    setSlides([...slides, { type: 'image', url: '', caption: '' }]);
  };

  const removeSlide = (index) => {
    setSlides(slides.filter((_, i) => i !== index));
  };

  const updateSlide = (index, field, value) => {
    const newSlides = [...slides];
    newSlides[index] = { ...newSlides[index], [field]: value };
    setSlides(newSlides);
  };

  const handleSave = async () => {
    if (!username || slides.length === 0) {
      toast.error('Please add username and at least one slide');
      return;
    }

    if (slides.some(s => !s.url)) {
      toast.error('Please add image URL for all slides');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        username,
        avatar: avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random`,
        isOfficial,
        slides: slides.map(s => ({
          type: s.type || 'image',
          url: s.url,
          caption: s.caption || '',
        })),
        store,
      };

      const url = story 
        ? `${API_URL}/api/stories/${story.id}`
        : `${API_URL}/api/stories`;
      
      const res = await fetch(url, {
        method: story ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      
      if (data.success) {
        toast.success(story ? 'Story updated!' : 'Story created!');
        onSave();
      } else {
        toast.error(data.detail || 'Failed to save story');
      }
    } catch (e) {
      toast.error('Error saving story');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold">
            {story ? 'Edit Story' : 'Create New Story'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="text-sm font-medium mb-1 block">Username</label>
              <Input
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g., TNV Official"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Avatar URL</label>
              <Input
                value={avatar}
                onChange={(e) => setAvatar(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <input
              type="checkbox"
              id="isOfficial"
              checked={isOfficial}
              onChange={(e) => setIsOfficial(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="isOfficial" className="text-sm">Mark as Official Account</label>
          </div>

          {/* Slides */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium">Slides ({slides.length})</label>
              <Button variant="outline" size="sm" onClick={addSlide}>
                <Plus className="w-4 h-4 mr-1" />
                Add Slide
              </Button>
            </div>

            <div className="space-y-3">
              {slides.map((slide, index) => (
                <div key={index} className="flex gap-3 p-3 bg-gray-50 rounded-lg">
                  {/* Preview */}
                  <div className="w-20 h-32 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                    {slide.url ? (
                      <img src={slide.url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <Image className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 space-y-2">
                    <Input
                      value={slide.url}
                      onChange={(e) => updateSlide(index, 'url', e.target.value)}
                      placeholder="Image URL (https://...)"
                    />
                    <Input
                      value={slide.caption || ''}
                      onChange={(e) => updateSlide(index, 'caption', e.target.value)}
                      placeholder="Caption (optional)"
                    />
                  </div>

                  {/* Delete */}
                  <button 
                    onClick={() => removeSlide(index)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg self-start"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              {slides.length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Image className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No slides added yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {story ? 'Update Story' : 'Create Story'}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default StoriesManager;
