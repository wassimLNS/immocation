import React, { useState, useEffect, useRef } from 'react';
import { GoogleMap, LoadScript, Marker, OverlayView } from '@react-google-maps/api';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box, 
  Container,
  Card,
  CardContent,
  Grid,
  IconButton,
  Alert,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import { AccountCircle, Edit as EditIcon, Delete as DeleteIcon, Favorite as FavoriteIcon, FavoriteBorder as FavoriteBorderIcon, MyLocation as MyLocationIcon, Fullscreen as FullscreenIcon, FullscreenExit as FullscreenExitIcon } from '@mui/icons-material';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, deleteUser } from 'firebase/auth';
import { auth, db } from './firebase';
import Auth from './components/Auth';
import PropertyForm from './components/PropertyForm';
import AccountSettings from './components/AccountSettings';
import './App.css';

const containerStyle = {
  width: '100%',
  height: '500px'
};

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
  isFavorite?: boolean;
}

// Helper function to calculate distance between two points in meters
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI/180; // φ, λ in radians
  const φ2 = lat2 * Math.PI/180;
  const Δφ = (lat2-lat1) * Math.PI/180;
  const Δλ = (lng2-lng1) * Math.PI/180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  const d = R * c; // in metres
  return d;
};

// Helper function to calculate bounds for a square around a point
const getSquareBounds = (lat: number, lng: number, sideInMeters: number) => {
  const latOffset = sideInMeters / 2;
  const lngOffset = sideInMeters / 2;

  const latPerMeter = 1 / 111319.9; // Approximate meters per degree latitude
  const lngPerMeter = 1 / (111319.9 * Math.cos(lat * Math.PI / 180)); // Approximate meters per degree longitude at this latitude

  const latDelta = latOffset * latPerMeter;
  const lngDelta = lngOffset * lngPerMeter;

  return {
    north: lat + latDelta,
    south: lat - latDelta,
    east: lng + lngDelta,
    west: lng - lngDelta,
  };
};

// Add this new component before the App function
const LocationTracker = ({ position, heading }: { position: { lat: number; lng: number }, heading: number }) => {
  return (
    <OverlayView
      position={position}
      mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
      getPixelPositionOffset={(width, height) => ({
        x: -(width / 2),
        y: -(height / 2),
      })}
    >
      <div
        style={{
          width: '30px',
          height: '30px',
          transform: `rotate(${heading}deg)`,
          position: 'relative',
        }}
      >
        <div
          style={{
            width: '0',
            height: '0',
            borderLeft: '15px solid transparent',
            borderRight: '15px solid transparent',
            borderBottom: '30px solid #4285F4',
            opacity: 0.7,
          }}
        />
      </div>
    </OverlayView>
  );
};

function App() {
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isPropertyFormOpen, setIsPropertyFormOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isAddingPin, setIsAddingPin] = useState(false);
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 0, lng: 0 });
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  const [mapType, setMapType] = useState('roadmap');
  const [userProperties, setUserProperties] = useState<Property[]>([]);
  const [favoritePropertyIds, setFavoritePropertyIds] = useState<string[]>([]);
  const [editingPropertyLocationId, setEditingPropertyLocationId] = useState<string | null>(null);
  const [locationInitialized, setLocationInitialized] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [isModifyingListings, setIsModifyingListings] = useState(false);
  const [isMapFullscreen, setIsMapFullscreen] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [heading, setHeading] = useState<number>(0);

  // Get user location immediately when component mounts
  useEffect(() => {
    const getLocation = () => {
      const savedLocation = localStorage.getItem('userLocation');
      if (savedLocation) {
        const parsedLocation = JSON.parse(savedLocation);
        if (parsedLocation.lat !== 0 && parsedLocation.lng !== 0) {
          setUserLocation(parsedLocation);
          setSelectedLocation(parsedLocation);
          setCenter(parsedLocation);
          setLocationInitialized(true);
          setLoading(false);
          return;
        }
      }

      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const newLocation = {
              lat: position.coords.latitude,
              lng: position.coords.longitude
            };
            setUserLocation(newLocation);
            setSelectedLocation(newLocation);
            setCenter(newLocation);
            localStorage.setItem('userLocation', JSON.stringify(newLocation));
            setLocationInitialized(true);
            setLoading(false);
          },
          (error) => {
            console.error('Geolocation error:', error);
            const defaultLocation = { lat: 40.7128, lng: -74.0060 };
            setUserLocation(defaultLocation);
            setSelectedLocation(defaultLocation);
            setCenter(defaultLocation);
            setLocationInitialized(true);
            setLoading(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 0
          }
        );
      } else {
        const defaultLocation = { lat: 40.7128, lng: -74.0060 };
        setUserLocation(defaultLocation);
        setSelectedLocation(defaultLocation);
        setCenter(defaultLocation);
        setLocationInitialized(true);
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  useEffect(() => {
    if (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && mapRef.current) {
      mapRef.current.setCenter(userLocation);
    }
  }, [userLocation, mapRef.current]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setSelectedProperty(null);
        setIsAccountSettingsOpen(false);
        setUserProperties([]);
        setFavoritePropertyIds([]);
        setEditingPropertyLocationId(null);
        setIsModifyingListings(false);
        fetchProperties();
      } else {
        if (!user.emailVerified) {
          setError('Please verify your email address to fully access your account. A verification link was sent to your email when you signed up.');
        } else {
          setError(null); 
        }
        fetchUserProperties(user.uid);
        fetchFavoritePropertyIds(user.uid);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    fetchProperties();
  }, []);

  useEffect(() => {
    setProperties(prevProperties => 
      prevProperties.map(property => ({
        ...property,
        isFavorite: favoritePropertyIds.includes(property.id)
      }))
    );
    setUserProperties(prevUserProperties =>
      prevUserProperties.map(property => ({
        ...property,
        isFavorite: favoritePropertyIds.includes(property.id)
      }))
    );
    if (selectedProperty) {
      setSelectedProperty(prevSelected => prevSelected ? { ...prevSelected, isFavorite: favoritePropertyIds.includes(prevSelected.id) } : null);
    }
  }, [favoritePropertyIds, properties.length, userProperties.length, selectedProperty]);

  useEffect(() => {
    let watchId: number;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setSelectedLocation(newLocation);
          setCenter(newLocation);
          if (position.coords.heading !== null) {
            setHeading(position.coords.heading);
          }
          localStorage.setItem('userLocation', JSON.stringify(newLocation));
        },
        (error) => {
          console.error('Geolocation error:', error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }

    return () => {
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  const fetchProperties = async () => {
    try {
      const propertiesRef = collection(db, 'properties');
      const q = query(propertiesRef);
      const querySnapshot = await getDocs(q);
      const propertiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
      setProperties(propertiesData);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchUserProperties = async (userId: string) => {
    try {
      const propertiesRef = collection(db, 'properties');
      const userPropertiesQuery = query(propertiesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(userPropertiesQuery);
      const propertiesData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Property[];
      setUserProperties(propertiesData);
    } catch (err: any) {
      setError('Error fetching user properties: ' + err.message);
    }
  };

  const fetchFavoritePropertyIds = async (userId: string) => {
    try {
      const favoritesRef = collection(db, 'favorites');
      const userFavoritesQuery = query(favoritesRef, where('userId', '==', userId));
      const querySnapshot = await getDocs(userFavoritesQuery);
      const favoriteIds = querySnapshot.docs.map(doc => doc.data().propertyId);
      setFavoritePropertyIds(favoriteIds);
    } catch (err: any) {
      console.error('Error fetching favorite property IDs:', err);
    }
  };

  const handleMapLoad = (map: google.maps.Map) => {
    map.addListener('maptypeid_changed', () => {
      setMapType(map.getMapTypeId() || 'roadmap');
    });
  };

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (e.latLng && isAddingPin && locationInitialized) {
      const newLocation = {
        lat: e.latLng.lat(),
        lng: e.latLng.lng()
      };
      setSelectedLocation(newLocation);
      setIsPropertyFormOpen(true);
    } else if (!isAddingPin && !editingPropertyLocationId && !isModifyingListings) {
      setSelectedProperty(null);
    }
  };

  const handleMarkerClick = (property: Property) => {
    if (isModifyingListings && user && property.userId === user.uid) {
      setSelectedProperty(property);
      setEditingPropertyLocationId(property.id);
      setIsAddingPin(false);
    } else if (!editingPropertyLocationId && !isModifyingListings) {
       setSelectedProperty(property);
    }
  };

  const handleMapDragEnd = () => {
    if (!isAddingPin && userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && mapRef.current && !editingPropertyLocationId && !isModifyingListings) {
      const currentCenter = mapRef.current.getCenter();
      if (currentCenter) {
         const distance = calculateDistance(
           userLocation.lat,
           userLocation.lng,
           currentCenter.lat(),
           currentCenter.lng()
         );
         if (distance > 1500) {
           mapRef.current.setCenter(userLocation);
         }
      }
    }
  };

  const handleEditClick = () => {
    if (selectedProperty) {
       setIsPropertyFormOpen(true);
    }
  };

  const handleDeleteClick = async () => {
    if (selectedProperty && user && selectedProperty.userId === user.uid) {
       if (window.confirm('Are you sure you want to delete this property?')) {
         try {
           await deleteDoc(doc(db, 'properties', selectedProperty.id));
           setProperties(properties.filter(p => p.id !== selectedProperty.id));
           setUserProperties(userProperties.filter(p => p.id !== selectedProperty.id));
           setSelectedProperty(null);
           setEditingPropertyLocationId(null);
         } catch (err: any) {
           setError('Error deleting property: ' + err.message);
         }
       }
    }
  };

  const handleDeleteAccount = async () => {
    if (user && window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        const propertiesRef = collection(db, 'properties');
        const userPropertiesQuery = query(propertiesRef, where('userId', '==', user.uid));
        const querySnapshot = await getDocs(userPropertiesQuery);

        const deletePromises = querySnapshot.docs.map(docToDelete => deleteDoc(doc(db, 'properties', docToDelete.id)));
        await Promise.all(deletePromises);

        await deleteUser(user); 
      } catch (err: any) {
        console.error('Error deleting account or properties:', err);
        if (err.code === 'auth/requires-recent-login') {
          setError('Please log in again to delete your account and properties.');
        } else {
           setError('Error deleting account or properties: ' + err.message);
        }
      }
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    if (!user) {
      setError('You must be logged in to favorite properties.');
      return;
    }

    const favoriteRef = doc(db, 'favorites', `${user.uid}_${propertyId}`);

    try {
      if (favoritePropertyIds.includes(propertyId)) {
        await deleteDoc(favoriteRef);
        setFavoritePropertyIds(favoritePropertyIds.filter(id => id !== propertyId));
      } else {
        await setDoc(favoriteRef, {
          userId: user.uid,
          propertyId: propertyId,
          createdAt: new Date(),
        });
        setFavoritePropertyIds([...favoritePropertyIds, propertyId]);
      }
    } catch (err: any) {
      console.error('Error toggling favorite status:', err);
      setError('Error updating favorite status.');
    }
  };

  const updatePropertyLocation = async (propertyId: string, newPosition: { lat: number; lng: number }) => {
    if (!user) {
      setError('You must be logged in to update a property location.');
      return;
    }

    try {
      const propertyRef = doc(db, 'properties', propertyId);
      await updateDoc(propertyRef, { position: newPosition });

      setProperties(prevProperties => 
        prevProperties.map(property => 
          property.id === propertyId ? { ...property, position: newPosition } : property
        )
      );
      setUserProperties(prevUserProperties => 
        prevUserProperties.map(property =>
          property.id === propertyId ? { ...property, position: newPosition } : property
        )
      );
      if (selectedProperty && selectedProperty.id === propertyId) {
         setSelectedProperty(prevSelected => prevSelected ? { ...prevSelected, position: newPosition } : null);
      }

    } catch (err: any) {
      console.error('Error updating property location:', err);
      setError('Error updating property location.');
    }
  };

  const handlePropertyDragEnd = (property: Property) => (event: google.maps.MapMouseEvent) => {
    if (event.latLng) {
      const newPosition = {
        lat: event.latLng.lat(),
        lng: event.latLng.lng(),
      };
      if (editingPropertyLocationId === property.id && user && property.userId === user.uid) {
         updatePropertyLocation(property.id, newPosition);
      }
    }
  };

  const handleCancelLocationEdit = () => {
    setEditingPropertyLocationId(null);
    setError(null);
  };

  const handleModifyListingsClick = () => {
    setIsModifyingListings(!isModifyingListings);
    setSelectedProperty(null);
    setEditingPropertyLocationId(null);
    setIsAddingPin(false);
    setIsPropertyFormOpen(false);
  };

  const handleMyLocationClick = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(newLocation);
          setSelectedLocation(newLocation);
          setCenter(newLocation);
          if (mapRef.current) {
            mapRef.current.setCenter(newLocation);
          }
          localStorage.setItem('userLocation', JSON.stringify(newLocation));
        },
        (error) => {
          console.error('Geolocation error:', error);
          setError('Error getting your location. Please check your location permissions.');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    } else {
      setError('Geolocation is not supported by your browser.');
    }
  };

  const handleToggleFullscreen = () => {
    setIsMapFullscreen(!isMapFullscreen);
    setTimeout(() => {
      if (mapRef.current) {
        window.google.maps.event.trigger(mapRef.current, 'resize');
        const currentCenter = mapRef.current.getCenter();
        const currentZoom = mapRef.current.getZoom();
        if (currentCenter && currentZoom !== undefined) {
           mapRef.current.setZoom(currentZoom);
           mapRef.current.setCenter(currentCenter);
        }
      }
    }, 100);
  };

  const nearbyProperties = properties.filter(property => 
    userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && calculateDistance(userLocation.lat, userLocation.lng, property.position.lat, property.position.lng) <= 1000
  );

  const propertiesToShow = isModifyingListings && user 
    ? properties.filter(property => user && property.userId === user.uid)
    : (userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 ? nearbyProperties : properties);

  const favoriteProperties = properties.filter(property => favoritePropertyIds.includes(property.id));

  const restrictedBounds = !isAddingPin && !isModifyingListings && userLocation && userLocation.lat !== 0 && userLocation.lng !== 0
    ? getSquareBounds(userLocation.lat, userLocation.lng, 2000)
    : undefined;

  if (loading) {
    return <div>Loading map...</div>;
  }

  if (error && !editingPropertyLocationId && !isAddingPin) {
    return (
      <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Property Finder
            </Typography>
            {user && (
              <Button 
                color="inherit" 
                onClick={handleModifyListingsClick}
                sx={{
                  mr: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': { 
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                {isModifyingListings ? 'Exit Modify Mode' : 'Modify My Listings'}
              </Button>
            )}
            {user ? (
              <>
                {isAddingPin ? (
                   <Button 
                     color="inherit" 
                     onClick={() => setIsAddingPin(false)} 
                     sx={{
                       mr: 2,
                       transition: 'transform 0.2s, box-shadow 0.2s',
                       '&:hover': {
                         backgroundColor: 'rgba(255, 255, 255, 0.1)',
                         transform: 'translateY(-2px)',
                         boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                       },
                     }}
                   >
                     Cancel Adding Pin
                   </Button>
                ) : (
                   <Button 
                     color="inherit" 
                     onClick={() => {
                       setIsAddingPin(true);
                       setSelectedProperty(null);
                       setEditingPropertyLocationId(null);
                     }}
                     sx={{
                       mr: 2,
                       transition: 'transform 0.2s, box-shadow 0.2s',
                       '&:hover': {
                         backgroundColor: 'rgba(255, 255, 255, 0.1)',
                         transform: 'translateY(-2px)',
                         boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                       },
                     }}
                   >
                     Add New Property
                   </Button>
                )}
                <Button 
                  color="inherit" 
                  onClick={() => setIsAccountSettingsOpen(true)} 
                  sx={{
                    mr: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                >
                  Account Settings
                </Button>
                <Button 
                  color="inherit" 
                  onClick={() => auth.signOut()} 
                  sx={{
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.1)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                    },
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <Button 
                color="inherit" 
                onClick={() => setIsAuthOpen(true)} 
                sx={{
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                Login
              </Button>
            )}
          </Toolbar>
        </AppBar>
        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Alert severity="error">{error}</Alert>
        </Container>
      </div>
    );
  }

  return (
    <div className="App" style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Property Finder
          </Typography>
          {user && (
            <Button 
              color="inherit" 
              onClick={handleModifyListingsClick}
              sx={{
                mr: 2,
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': { 
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              {isModifyingListings ? 'Exit Modify Mode' : 'Modify My Listings'}
            </Button>
          )}
          {user ? (
            <>
              {isAddingPin ? (
                 <Button 
                   color="inherit" 
                   onClick={() => setIsAddingPin(false)} 
                   sx={{
                     mr: 2,
                     transition: 'transform 0.2s, box-shadow 0.2s',
                     '&:hover': {
                       backgroundColor: 'rgba(255, 255, 255, 0.1)',
                       transform: 'translateY(-2px)',
                       boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                     },
                   }}
                 >
                   Cancel Adding Pin
                 </Button>
              ) : (
                 <Button 
                   color="inherit" 
                   onClick={() => {
                     setIsAddingPin(true);
                     setSelectedProperty(null);
                     setEditingPropertyLocationId(null);
                   }}
                   sx={{
                     mr: 2,
                     transition: 'transform 0.2s, box-shadow 0.2s',
                     '&:hover': {
                       backgroundColor: 'rgba(255, 255, 255, 0.1)',
                       transform: 'translateY(-2px)',
                       boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                     },
                   }}
                 >
                   Add New Property
                 </Button>
              )}
              <Button 
                color="inherit" 
                onClick={() => setIsAccountSettingsOpen(true)} 
                sx={{
                  mr: 2,
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                Account Settings
              </Button>
              <Button 
                color="inherit" 
                onClick={() => auth.signOut()} 
                sx={{
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                  },
                }}
              >
                Logout
              </Button>
            </>
          ) : (
            <Button 
              color="inherit" 
              onClick={() => setIsAuthOpen(true)} 
              sx={{
                transition: 'transform 0.2s, box-shadow 0.2s',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
                },
              }}
            >
              Login
            </Button>
          )}
        </Toolbar>
      </AppBar>

      <Container 
        maxWidth={isMapFullscreen ? false : "lg"}
        sx={{
          mt: isMapFullscreen ? 0 : 4,
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: isMapFullscreen ? 0 : 3,
          m: isMapFullscreen ? 0 : 'auto',
          width: '100%',
          maxWidth: isMapFullscreen ? '100%' : 'lg',
          height: isMapFullscreen ? 'calc(100vh - 64px)' : undefined,
          overflow: 'hidden'
        }}
      >
        {!error && isAddingPin && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Click on the map to add a new property pin
          </Alert>
        )}
        {!error && isModifyingListings && !selectedProperty && (
           <Alert severity="info" sx={{ mb: 2 }}>
             Click on one of your pins to modify or delete it.
           </Alert>
        )}
        {!error && editingPropertyLocationId && selectedProperty && (
           <Alert severity="info" sx={{ mb: 2 }}>
             Drag the marker on the map to change its location.
           </Alert>
        )}
        <Grid 
          container 
          spacing={isMapFullscreen ? 0 : 3}
          sx={{
            flex: 1,
            height: '100%',
            width: '100%',
            m: 0
          }}
        >
          <Grid 
            item 
            xs={12} 
            md={isMapFullscreen ? 12 : 8}
            sx={{
              height: isMapFullscreen ? '100%' : '50%',
              p: isMapFullscreen ? '0 !important' : '24px',
              margin: 0,
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            <div 
              className="map-container" 
              style={{
                position: 'relative',
                flex: 1,
                width: '100%'
              }}
            >
              <Button
                variant="contained"
                color="primary"
                onClick={handleMyLocationClick}
                sx={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '120px',
                  zIndex: 1000,
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  padding: 0,
                  backgroundColor: 'white',
                  color: 'black',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                <MyLocationIcon />
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={handleToggleFullscreen}
                sx={{
                  position: 'absolute',
                  bottom: '20px',
                  right: '70px',
                  zIndex: 1000,
                  minWidth: '40px',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  padding: 0,
                  backgroundColor: 'white',
                  color: 'black',
                  '&:hover': {
                    backgroundColor: '#f0f0f0',
                  },
                  boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                }}
              >
                {isMapFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
              </Button>
              <LoadScript 
                googleMapsApiKey="AIzaSyDQgyaG097gD3lXAI-G-RNv6keTRfSB-e4"
                onLoad={() => setIsApiLoaded(true)}
                onError={(error) => console.error('Google Maps API load error:', error)}
                libraries={['places', 'geometry', 'visualization', 'drawing']}
              >
                <GoogleMap
                  mapContainerStyle={{
                    width: '100%',
                    height: '100%'
                  }}
                  center={center}
                  zoom={13}
                  onClick={handleMapClick}
                  onLoad={(map) => {
                    mapRef.current = map;
                    handleMapLoad(map);
                  }}
                  onDragEnd={isAddingPin ? handleMapDragEnd : undefined}
                  options={{
                    zoomControl: true,
                    scrollwheel: true,
                    disableDoubleClickZoom: false,
                    restriction: !isAddingPin && !isModifyingListings && restrictedBounds ? {
                      latLngBounds: restrictedBounds,
                      strictBounds: true
                    } : undefined,
                    minZoom: isAddingPin || isModifyingListings ? undefined : (editingPropertyLocationId ? 10 : 12),
                    maxZoom: isAddingPin || isModifyingListings ? undefined : (editingPropertyLocationId ? undefined : undefined),
                    mapTypeControl: false,
                    streetViewControl: false,
                    fullscreenControl: false
                  }}
                >
                  {propertiesToShow.map((property) => (
                    <Marker
                      key={property.id}
                      position={property.position}
                      onClick={() => handleMarkerClick(property)}
                      draggable={!!(user && property.userId === user.uid && isModifyingListings && selectedProperty && property.id === selectedProperty.id)}
                      onDragEnd={user && property.userId === user.uid && isModifyingListings && selectedProperty && property.id === selectedProperty.id ? handlePropertyDragEnd(property) : undefined}
                      icon={{
                        url: property.type === 'rent' ? 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' : 'http://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        scaledSize: new window.google.maps.Size(30, 30)
                      }}
                    />
                  ))}
                   {isAddingPin && selectedLocation && selectedLocation.lat !== 0 && selectedLocation.lng !== 0 && (
              <Marker position={selectedLocation} />
                   )}
                   {userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && (
                     <LocationTracker position={userLocation} heading={heading} />
                   )}
                </GoogleMap>
              </LoadScript>
            </div>
          </Grid>
          {!isMapFullscreen && (
            <Grid item xs={12} md={4}>
              <Box sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff', position: 'sticky', top: 0, zIndex: 1 }}>
                <Typography variant="h6" gutterBottom>Map Legend</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 15, height: 15, backgroundColor: 'green', mr: 1 }}></Box>
                  <Typography variant="body2">For Rent</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Box sx={{ width: 15, height: 15, backgroundColor: 'red', mr: 1 }}></Box>
                  <Typography variant="body2">For Sale</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Box sx={{ width: 15, height: 15, backgroundColor: 'blue', mr: 1 }}></Box>
                  <Typography variant="body2">Your Location</Typography>
                </Box>
              </Box>

              <Box sx={{ height: 'calc(100vh - 300px)', overflow: 'auto' }}>
                {user && favoriteProperties.length > 0 && (
                  <Box sx={{ mb: 2, p: 2, border: '1px solid #ccc', borderRadius: '8px', backgroundColor: '#fff' }}>
                    <Typography variant="h6" gutterBottom>My Favorites</Typography>
                    <List dense={true}>
                      {favoriteProperties.map((property) => (
                        <ListItem key={property.id} divider button onClick={() => handleMarkerClick(property)}>
                          <ListItemText 
                            primary={property.title}
                            secondary={`Type: ${property.type}, Price: $${property.price}`}
                          />
                          <ListItemSecondaryAction>
                            <IconButton edge="end" aria-label="favorite" onClick={(e) => {e.stopPropagation(); toggleFavorite(property.id);}}>
                              <FavoriteIcon color="secondary" />
                            </IconButton>
                          </ListItemSecondaryAction>
                        </ListItem>
                      ))}
                    </List>
                  </Box>
                )}

                {selectedProperty ? (
                  <Card sx={{ mb: 2 }}>
                    <CardContent>
                      <Typography variant="h6">{selectedProperty.title}</Typography>
                      <Typography color="textSecondary">
                        {selectedProperty.type === 'rent' ? 'For Rent' : 'For Sale'}
                      </Typography>
                      <Typography variant="h5" color="primary">
                        ${selectedProperty.price}
                      </Typography>
                      <Typography variant="body2">{selectedProperty.description}</Typography>
                      {selectedProperty.link && (
                        <Button
                          href={selectedProperty.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            mt: 1,
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            },
                          }}
                        >
                          View Original Listing
                        </Button>
                      )}
                      {selectedProperty && userLocation && userLocation.lat !== 0 && userLocation.lng !== 0 && (
                        <Button
                          variant="outlined"
                          sx={{
                            mt: 1, 
                            transition: 'transform 0.2s, box-shadow 0.2s',
                            '&:hover': {
                              backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              transform: 'translateY(-2px)',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                            },
                          }} 
                          href={`https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lng}&destination=${selectedProperty.position.lat},${selectedProperty.position.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          Get Directions
                        </Button>
                      )}
                      {user && selectedProperty && (
                        <IconButton 
                          aria-label="favorite"
                          onClick={() => toggleFavorite(selectedProperty.id)}
                          sx={{ mt: 1 }}
                        >
                          {selectedProperty.isFavorite ? <FavoriteIcon color="secondary" /> : <FavoriteBorderIcon />}
                        </IconButton>
                      )}
                      {user && selectedProperty && (
                        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                          <Button 
                            variant="outlined" 
                            color="primary" 
                            sx={{
                              mr: 1,
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              },
                            }}
                            onClick={handleEditClick}
                          >
                            Edit Details
                          </Button>
                          <Button 
                            variant="outlined" 
                            color="error" 
                            sx={{
                              transition: 'transform 0.2s, box-shadow 0.2s',
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                transform: 'translateY(-2px)',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              },
                            }}
                            onClick={handleDeleteClick}
                          >
                            Delete
                          </Button>
                        </Box>
                      )}
                      {editingPropertyLocationId === selectedProperty.id && selectedProperty && isModifyingListings && (
                         <Alert severity="info" sx={{ mt: 2 }}>
                           Drag the marker on the map to change its location.
                         </Alert>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <Typography variant="body1" sx={{ textAlign: 'center', mt: 2 }}>
                    {isAddingPin ? 'Click on the map to add a new property pin' : (isModifyingListings ? 'Click on one of your pins to modify or delete it.' : 'Click on a marker to view property details')}
                  </Typography>
                )}
              </Box>
            </Grid>
          )}
        </Grid>
      </Container>

      <Auth isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} />
      {(isPropertyFormOpen && (selectedLocation || (selectedProperty && !isAddingPin))) && (
        <PropertyForm
          isOpen={isPropertyFormOpen}
          onClose={() => {
            setIsPropertyFormOpen(false);
            if (isAddingPin) {
               setIsAddingPin(false);
               setSelectedLocation(userLocation);
            } else if (isModifyingListings) {
               setEditingPropertyLocationId(null);
            } else {
               setSelectedProperty(null);
               setEditingPropertyLocationId(null);
            }
            fetchProperties();
            if (user) {
              fetchUserProperties(user.uid);
              fetchFavoritePropertyIds(user.uid);
            }
          }}
          position={isAddingPin && selectedLocation ? selectedLocation : (selectedProperty ? selectedProperty.position : {lat: 0, lng: 0}) as {lat: number, lng: number}}
          user={user}
          propertyToEdit={!isAddingPin ? selectedProperty : null}
        />
      )}
      <AccountSettings 
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
        user={user}
        onDeleteAccount={handleDeleteAccount}
      />
    </div>
  );
}

export default App;
