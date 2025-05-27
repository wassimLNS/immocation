import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Typography
} from '@mui/material';
import { collection, addDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

interface Property {
  id: string;
  title: string;
  description: string;
  price: number;
  type: string;
  link?: string;
  position: {
    lat: number;
    lng: number;
  };
  userId: string;
  createdAt: any;
}

interface PropertyFormProps {
  isOpen: boolean;
  onClose: () => void;
  position: {
    lat: number;
    lng: number;
  }; // Default position for new properties
  user: any;
  propertyToEdit: Property | null;
}

const PropertyForm: React.FC<PropertyFormProps> = ({ isOpen, onClose, position, user, propertyToEdit }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [type, setType] = useState('rent');
  const [link, setLink] = useState('');
  const [currentPosition, setCurrentPosition] = useState(position); // State for editable position
  const [error, setError] = useState('');

  useEffect(() => {
    if (propertyToEdit) {
      // Populate form if editing an existing property
      setTitle(propertyToEdit.title);
      setDescription(propertyToEdit.description);
      setPrice(propertyToEdit.price.toString());
      setType(propertyToEdit.type);
      setLink(propertyToEdit.link || '');
      setCurrentPosition(propertyToEdit.position); // Set current position for editing
    } else {
      // Clear form and set default position if adding a new property
      setTitle('');
      setDescription('');
      setPrice('');
      setType('rent');
      setLink('');
      setCurrentPosition(position); // Set default position from prop
    }
  }, [propertyToEdit, position]); // Depend on propertyToEdit and position

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!user) {
      setError('You must be logged in to add or edit a property.');
      return;
    }

    const propertyData = {
      title,
      description,
      price: parseFloat(price),
      type,
      link,
      position: currentPosition, // Use the editable position state
      userId: user.uid,
    };

    try {
      if (propertyToEdit) {
        // Update existing property
        const propertyRef = doc(db, 'properties', propertyToEdit.id);
        await updateDoc(propertyRef, propertyData);
      } else {
        // Add new property
        await addDoc(collection(db, 'properties'), {
          ...propertyData,
          createdAt: new Date(),
        });
      }
      onClose();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{propertyToEdit ? 'Edit Property Listing' : 'Add Property Listing'}</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
          <TextField
            margin="normal"
            required
            fullWidth
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            multiline
            rows={4}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="Price"
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={type}
              label="Type"
              onChange={(e) => setType(e.target.value)}
            >
              <MenuItem value="rent">For Rent</MenuItem>
              <MenuItem value="sale">For Sale</MenuItem>
            </Select>
          </FormControl>
          <TextField
            margin="normal"
            fullWidth
            label="Listing Link (optional)"
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />

          {/* Editable Position Fields when editing */}
          {propertyToEdit && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>Position</Typography>
              <TextField
                margin="normal"
                required
                fullWidth
                label="Latitude"
                type="number"
                value={currentPosition.lat}
                onChange={(e) => setCurrentPosition({ ...currentPosition, lat: parseFloat(e.target.value) })}
              />
              <TextField
                margin="normal"
                required
                fullWidth
                label="Longitude"
                type="number"
                value={currentPosition.lng}
                onChange={(e) => setCurrentPosition({ ...currentPosition, lng: parseFloat(e.target.value) })}
              />
            </Box>
          )}

        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSubmit} variant="contained">{propertyToEdit ? 'Save Changes' : 'Add Listing'}</Button>
      </DialogActions>
    </Dialog>
  );
};

export default PropertyForm; 