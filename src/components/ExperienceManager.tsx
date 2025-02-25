'use client';

import { useState } from 'react';
import { Plus, X, Edit, Save, Trash2 } from 'lucide-react';

interface Position {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

interface ExperienceManagerProps {
  positions: Position[];
  onChange: (positions: Position[]) => void;
}

export default function ExperienceManager({ positions, onChange }: ExperienceManagerProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [newPosition, setNewPosition] = useState<Position>({
    title: '',
    company: '',
    startDate: '',
    endDate: '',
    description: ''
  });

  const resetForm = () => {
    setNewPosition({
      title: '',
      company: '',
      startDate: '',
      endDate: '',
      description: ''
    });
  };

  const handleAddPosition = () => {
    if (newPosition.title.trim() && newPosition.company.trim()) {
      const updatedPositions = [...positions, { ...newPosition }];
      onChange(updatedPositions);
      resetForm();
      setIsAdding(false);
    }
  };

  const handleUpdatePosition = () => {
    if (editingIndex !== null && newPosition.title.trim() && newPosition.company.trim()) {
      const updatedPositions = [...positions];
      updatedPositions[editingIndex] = { ...newPosition };
      onChange(updatedPositions);
      resetForm();
      setEditingIndex(null);
    }
  };

  const handleEditPosition = (index: number) => {
    setNewPosition({ ...positions[index] });
    setEditingIndex(index);
    setIsAdding(false);
  };

  const handleDeletePosition = (index: number) => {
    const updatedPositions = positions.filter((_, i) => i !== index);
    onChange(updatedPositions);
    if (editingIndex === index) {
      resetForm();
      setEditingIndex(null);
    }
  };

  const handleCancel = () => {
    resetForm();
    setIsAdding(false);
    setEditingIndex(null);
  };

  return (
    <div className="space-y-6">
      {/* List of positions */}
      {positions.length > 0 && (
        <div className="space-y-4">
          {positions.map((position, index) => (
            <div 
              key={index} 
              className={`p-4 border rounded-md ${editingIndex === index ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-gray-900">{position.title}</h4>
                  <p className="text-gray-600">{position.company}</p>
                  <p className="text-sm text-gray-500">
                    {position.startDate} {position.endDate ? `- ${position.endDate}` : '- Present'}
                  </p>
                  {position.description && (
                    <p className="mt-2 text-gray-700">{position.description}</p>
                  )}
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEditPosition(index)}
                    className="text-blue-600 hover:text-blue-800"
                    aria-label="Edit position"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDeletePosition(index)}
                    className="text-red-600 hover:text-red-800"
                    aria-label="Delete position"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {(isAdding || editingIndex !== null) && (
        <div className="p-4 border border-blue-300 rounded-md bg-blue-50">
          <h4 className="font-medium text-gray-900 mb-3">
            {editingIndex !== null ? 'Edit Position' : 'Add New Position'}
          </h4>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title*
                </label>
                <input
                  id="title"
                  type="text"
                  value={newPosition.title}
                  onChange={(e) => setNewPosition({ ...newPosition, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Software Engineer"
                  required
                />
              </div>
              <div>
                <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                  Company*
                </label>
                <input
                  id="company"
                  type="text"
                  value={newPosition.company}
                  onChange={(e) => setNewPosition({ ...newPosition, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Acme Inc."
                  required
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                  Start Date
                </label>
                <input
                  id="startDate"
                  type="text"
                  value={newPosition.startDate}
                  onChange={(e) => setNewPosition({ ...newPosition, startDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 01/2020 or Jan 2020"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                  End Date (leave empty for current position)
                </label>
                <input
                  id="endDate"
                  type="text"
                  value={newPosition.endDate}
                  onChange={(e) => setNewPosition({ ...newPosition, endDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., 12/2022 or Present"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                value={newPosition.description}
                onChange={(e) => setNewPosition({ ...newPosition, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Describe your responsibilities and achievements"
                rows={3}
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Cancel
              </button>
              <button
                onClick={editingIndex !== null ? handleUpdatePosition : handleAddPosition}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {editingIndex !== null ? 'Update' : 'Add'} Position
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add button */}
      {!isAdding && editingIndex === null && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
        >
          <Plus size={18} className="mr-1" />
          Add Work Experience
        </button>
      )}
    </div>
  );
} 