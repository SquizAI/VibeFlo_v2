import React, { useState, useEffect } from 'react';
import { Note as NoteType, Label, Task } from '../types';
import { useNoteStore } from '../store/noteStore';
import FolderNavigation, { Folder } from './FolderNavigation';
import EnhancedSearch from './EnhancedSearch';
import SecureNote from './SecureNote';
import { 
  Calendar, Star, Flag, User, Bell, CheckSquare, Tag, 
  Edit, Trash2, Lock, Pin, Heart, Plus, ChevronDown, ChevronRight, X,
  Mic as MicrophoneIcon,
  Search
} from 'lucide-react';
import { PlusIcon, XIcon } from 'lucide-react';

interface NoteViewProps {
  onSwitchToCanvas: () => void;
  selectedFolder?: string;
  searchTerm?: string;
}

interface NoteCardProps {
  note: NoteType;
  onClick: () => void;
  isSelected: boolean;
  onDelete: () => void;
}

const NoteCard: React.FC<NoteCardProps> = ({ note, onClick, isSelected, onDelete }) => {
  return (
    <div 
      className={`p-3 border rounded-md cursor-pointer transition-colors ${
        isSelected ? 'bg-primary/10 border-primary' : 'bg-secondary border-border-light hover:bg-secondary-hover'
      }`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start">
        <h3 className="font-medium truncate">
          {note.content && typeof note.content === 'string' 
            ? note.content.split('\n')[0].substring(0, 40) || 'Untitled' 
            : 'Untitled'}
        </h3>
        
        <button 
          className="p-1 text-muted hover:text-error rounded-full hover:bg-error/10 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      
      <div className="flex items-center gap-2 mt-2 text-xs text-muted">
        <span>{new Date(note.dueDate || Date.now()).toLocaleDateString()}</span>
        
        {note.category && (
          <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
            {note.category}
          </span>
        )}
      </div>
    </div>
  );
};

interface NoteEditorProps {
  note: NoteType;
  onClose: () => void;
  onUpdate: (note: NoteType) => void;
}

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onClose, onUpdate }) => {
  const [content, setContent] = useState(note.content || '');
  
  const handleSave = () => {
    onUpdate({
      ...note,
      content
    });
  };
  
  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-card w-full max-w-2xl rounded-lg shadow-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-border-light">
          <h2 className="text-lg font-semibold">Edit Note</h2>
          <button 
            className="p-1 rounded-full hover:bg-secondary"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-4">
          <textarea
            className="w-full h-64 p-3 bg-secondary border border-border-light rounded-md focus:outline-none focus:ring-1 focus:ring-primary"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type your note here..."
          />
        </div>
        
        <div className="flex justify-end gap-2 p-4 border-t border-border-light">
          <button 
            className="px-4 py-2 border border-border-light rounded-md hover:bg-secondary transition-colors"
            onClick={onClose}
          >
            Cancel
          </button>
          <button 
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
            onClick={handleSave}
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

const NoteView: React.FC<NoteViewProps> = ({ onSwitchToCanvas, selectedFolder = 'all', searchTerm = '' }) => {
  const { notes, addNote, deleteNote, updateNote, completeNote, setDueDate, setPriority, setAssignee } = useNoteStore();
  
  const [folders, setFolders] = useState<Folder[]>([
    { id: 'all', name: 'All Notes', parentId: null },
    { id: 'recent', name: 'Recent', parentId: null },
    { id: 'favorites', name: 'Favorites', parentId: null, isSmartFolder: true, filter: { type: 'favorite' } },
    { id: 'secure', name: 'Secure Notes', parentId: null, isSmartFolder: true, filter: { type: 'secure' } },
    { id: 'tasks', name: 'Tasks', parentId: null }
  ]);
  
  const [selectedFolderState, setSelectedFolderState] = useState<string>(selectedFolder);
  const [selectedNote, setSelectedNote] = useState<string | null>(null);
  const [filteredNotes, setFilteredNotes] = useState<NoteType[]>(notes);
  const [notesInView, setNotesInView] = useState<NoteType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>(searchTerm);
  
  // Update selected folder when prop changes
  useEffect(() => {
    if (selectedFolder) {
      setSelectedFolderState(selectedFolder);
    }
  }, [selectedFolder]);
  
  // Filter notes based on selected folder and search term
  useEffect(() => {
    let filtered: NoteType[] = [];
    
    const folder = folders.find(f => f.id === selectedFolderState);
    if (!folder) {
      setNotesInView(notes);
      return;
    }
    
    if (folder.id === 'all') {
      filtered = [...notes];
    } else if (folder.id === 'recent') {
      // Sort by most recently updated and take the top 10
      filtered = [...notes].sort((a, b) => {
        // Assuming notes have a lastUpdated property, or using ID as a fallback
        return Number(b.id) - Number(a.id);
      }).slice(0, 10);
    } else if (folder.isSmartFolder && folder.filter) {
      // Apply smart folder filter
      switch (folder.filter.type) {
        case 'favorite':
          filtered = notes.filter(note => note.labels?.some(label => label.name === 'Favorite'));
          break;
        case 'secure':
          filtered = notes.filter(note => 
            note.content && 
            typeof note.content === 'string' && 
            note.content.startsWith('encrypted:')
          );
          break;
        case 'tag':
          filtered = notes.filter(note => 
            note.labels?.some(label => label.name === folder.filter?.value)
          );
          break;
        case 'priority':
          filtered = notes.filter(note => note.priority === folder.filter?.value);
          break;
        case 'date':
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          filtered = notes.filter(note => {
            if (!note.dueDate) return false;
            const dueDate = new Date(note.dueDate);
            dueDate.setHours(0, 0, 0, 0);
            return dueDate.getTime() === today.getTime();
          });
          break;
      }
    } else if (folder.id === 'tasks') {
      // Show only task-type notes or notes with tasks
      filtered = notes.filter(note => 
        note.type === 'task' || (note.tasks && note.tasks.length > 0)
      );
    } else {
      // Regular folder - match by tag/label with folder name
      filtered = notes.filter(note => 
        note.labels?.some(label => label.name === folder.name) || 
        note.category === folder.id
      );
    }
    
    // Apply search filter if there's a search term
    if (searchQuery) {
      const search = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        (note.content && note.content.toLowerCase().includes(search)) ||
        (note.tasks && note.tasks.some(task => task.text.toLowerCase().includes(search)))
      );
    }
    
    setNotesInView(filtered);
  }, [selectedFolderState, notes, folders, searchQuery]);
  
  // Handle folder creation
  const handleFolderCreate = (folder: Folder) => {
    setFolders([...folders, folder]);
  };
  
  // Handle folder update
  const handleFolderUpdate = (folderId: string, updates: Partial<Folder>) => {
    setFolders(folders.map(folder => 
      folder.id === folderId ? { ...folder, ...updates } : folder
    ));
  };
  
  // Handle folder deletion
  const handleFolderDelete = (folderId: string) => {
    setFolders(folders.filter(folder => folder.id !== folderId));
    
    // If the deleted folder was selected, select 'All Notes'
    if (selectedFolder === folderId) {
      setSelectedFolderState('all');
    }
  };
  
  // Handle note selection
  const handleNoteSelect = (noteId: string) => {
    setSelectedNote(noteId);
  };
  
  // Handle new note creation
  const handleCreateNote = () => {
    const newNote: NoteType = {
      id: crypto.randomUUID(),
      type: 'sticky',
      content: '',
      position: { x: 0, y: 0 },
      color: 'blue',
      labels: []
    };
    
    // Add folder as label if not 'all', 'recent', 'favorites', 'secure', or 'tasks'
    if (!['all', 'recent', 'favorites', 'secure', 'tasks'].includes(selectedFolder)) {
      const folder = folders.find(f => f.id === selectedFolder);
      if (folder) {
        newNote.labels = [
          {
            id: crypto.randomUUID(),
            name: folder.name,
            color: '#3b82f6' // Default blue color
          }
        ];
      }
    }
    
    addNote(newNote);
    setSelectedNote(newNote.id);
  };
  
  // Handle note deletion
  const handleDeleteNote = (noteId: string) => {
    deleteNote(noteId);
    setSelectedNote(null);
  };
  
  // Handle note content update
  const handleContentChange = (id: string, content: string, isEncrypted?: boolean) => {
    updateNote(id, { content });
    
    // If it's a secure note, add it to the secure notes folder via a label
    if (isEncrypted) {
      const note = notes.find(n => n.id === id);
      if (note) {
        const secureLabel = note.labels?.find(l => l.name === 'Secure');
        if (!secureLabel) {
          const updatedLabels = [
            ...(note.labels || []),
            {
              id: crypto.randomUUID(),
              name: 'Secure',
              color: '#ef4444' // Red color for secure notes
            }
          ];
          updateNote(id, { labels: updatedLabels });
        }
      }
    }
  };
  
  // Handle adding a task to a note
  const handleAddTask = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const newTask: Task = {
      id: crypto.randomUUID(),
      text: 'New task',
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const updatedTasks = [...(note.tasks || []), newTask];
    updateNote(noteId, { tasks: updatedTasks, type: 'task' });
  };
  
  // Handle toggling task completion
  const handleToggleTask = (noteId: string, taskId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.tasks) return;
    
    const updatedTasks = note.tasks.map(task => {
      if (task.id === taskId) {
        return { ...task, done: !task.done };
      }
      return task;
    });
    
    updateNote(noteId, { tasks: updatedTasks });
  };
  
  // Handle adding a label/tag to a note
  const handleAddLabel = (noteId: string, labelName: string, color: string = '#3b82f6') => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    // Check if label already exists
    if (note.labels?.some(l => l.name === labelName)) return;
    
    const newLabel: Label = {
      id: crypto.randomUUID(),
      name: labelName,
      color
    };
    
    const updatedLabels = [...(note.labels || []), newLabel];
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Handle removing a label from a note
  const handleRemoveLabel = (noteId: string, labelId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note || !note.labels) return;
    
    const updatedLabels = note.labels.filter(label => label.id !== labelId);
    updateNote(noteId, { labels: updatedLabels });
  };
  
  // Toggle favorite status of a note
  const handleToggleFavorite = (noteId: string) => {
    const note = notes.find(n => n.id === noteId);
    if (!note) return;
    
    const favoriteLabel = note.labels?.find(l => l.name === 'Favorite');
    
    if (favoriteLabel) {
      // Remove favorite label
      handleRemoveLabel(noteId, favoriteLabel.id);
    } else {
      // Add favorite label
      handleAddLabel(noteId, 'Favorite', '#eab308'); // Yellow color for favorites
    }
  };
  
  // Add handleMicButtonClick function
  const handleMicButtonClick = () => {
    // TODO: Implement voice recording functionality
    console.log('Starting voice recording...');
  };
  
  // Render component logic
  return (
    <div className="note-view h-full flex flex-col">
      <div className="note-view-panel h-full overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-border-light">
          <h2 className="text-xl font-semibold">Notes</h2>
          
          <div className="flex gap-2">
            <div className="relative w-36">
              <select
                className="w-full p-2 bg-secondary border border-border-light rounded-md text-sm"
                onChange={(e) => {
                  // Add sorting logic here
                  console.log('Sort by:', e.target.value);
                }}
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="alpha-asc">A-Z</option>
                <option value="alpha-desc">Z-A</option>
              </select>
            </div>
            
            <button 
              className="flex items-center gap-1 px-3 py-2 bg-primary text-white rounded-md hover:bg-primary-hover transition-colors"
              onClick={handleCreateNote}
            >
              <Plus className="w-4 h-4" /> New
            </button>
          </div>
        </div>
        
        <div className="p-4 border-b border-border-light">
          <div className="relative">
            <input
              type="text"
              placeholder="Search notes..."
              className="w-full p-2 pl-8 bg-secondary border border-border-light rounded-md"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="w-4 h-4 absolute left-2 top-1/2 transform -translate-y-1/2 text-muted" />
            {searchQuery && (
              <X
                className="w-4 h-4 absolute right-2 top-1/2 transform -translate-y-1/2 text-muted cursor-pointer"
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <span className="loading loading-spinner loading-md"></span>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotes.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-muted">No notes found</div>
                  <button 
                    className="mt-2 px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-primary-hover transition-colors"
                    onClick={handleCreateNote}
                  >
                    Create a new note
                  </button>
                </div>
              ) : (
                filteredNotes.map((note) => (
                  <NoteCard
                    key={note.id}
                    note={note}
                    onClick={() => handleNoteSelect(note.id)}
                    isSelected={selectedNote === note.id}
                    onDelete={() => handleDeleteNote(note.id)}
                  />
                ))
              )}
            </div>
          )}
        </div>
        
        <button 
          className="mic-button"
          onClick={handleMicButtonClick}
          title="Start Voice Recording"
        >
          <MicrophoneIcon className="w-6 h-6" />
        </button>
      </div>
      
      {selectedNote && (
        <NoteEditor 
          note={notes.find(n => n.id === selectedNote)!} 
          onClose={() => setSelectedNote(null)} 
          onUpdate={(updatedNote: NoteType) => {
            updateNote(updatedNote.id, updatedNote);
            setSelectedNote(updatedNote.id);
          }}
        />
      )}
    </div>
  );
};

export default NoteView; 