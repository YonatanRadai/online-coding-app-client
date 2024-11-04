// Lobby.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Box, Button, Paper, Typography, Rating, CircularProgress } from '@mui/material';

// Imports Section Notes:
// - React hooks `useState` and `useEffect` are used to manage component state and perform side effects (e.g., fetching data).
// - `useNavigate` is used to programmatically navigate to other pages within the app.
// - Material UI components (`Container`, `Box`, `Button`, `Paper`, `Typography`, `Rating`, `CircularProgress`) are used to build the UI.

function Lobby(props) {
  const url = props.url
  // State Variables:
  const [codeBlocks, setCodeBlocks] = useState([]); // Stores the list of code blocks fetched from the backend.
  const [loading, setLoading] = useState(true); // Tracks whether the code blocks are still being loaded.
  
  const navigate = useNavigate(); // Hook to allow programmatic navigation to other routes.

  // useEffect Hook:
  // - Runs on component mount to fetch the list of code blocks from the backend server.
  // - Fetches code blocks from the API, processes them to calculate the average rating, and sets the component state.
  // - If an error occurs during data fetching, it logs the error and stops the loading spinner.
  useEffect(() => {
    // Fetch the code blocks from the backend
    fetch(url + '/api/codeblocks')
      .then((res) => res.json())
      .then((data) => {
        // Map the data to calculate the average rating for each code block
        const updatedBlocks = data.map(block => ({
          ...block, // Spread the original block data
          rating: block.numRatings > 0 ? block.totalRating / block.numRatings : 0 // Calculate average rating
        }));
        setCodeBlocks(updatedBlocks); // Update the state with the processed code blocks
        setLoading(false); // Set loading to false once data has been fetched
      })
      .catch((error) => {
        console.error('Error fetching code blocks:', error);
        setLoading(false); // Stop the loading spinner in case of an error
      });
  }, []); // Empty dependency array means this effect runs only once on component mount.

  // Conditional rendering:
  // - If the code blocks are still being fetched, display a loading spinner (CircularProgress).
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress /> {/* Loading spinner shown while data is being fetched */}
      </Box>
    );
  }

  // Rendered JSX:
  // - A container with a title and a list of code blocks.
  // - Each code block is displayed inside a Paper component, showing the name, average rating, and a button to start coding.
  return (
    <Container>
      {/* Title of the lobby */}
      <Typography variant="h3" align="center" gutterBottom>
        Choose a Code Block
      </Typography>

      {/* Display the list of code blocks */}
      <Box display="flex" justifyContent="center" flexWrap="wrap" gap={3}>
        {codeBlocks.map((block) => (
          <Paper
            key={block._id} // Unique key for each code block
            sx={{
              padding: 3,
              width: '300px',
              textAlign: 'center',
              backgroundColor: 'background.default',
              borderRadius: '12px',
              boxShadow: 3,
            }}
          >
            {/* Code block name */}
            <Typography variant="h5" gutterBottom>
              {block.codeBlockName}
            </Typography>

            {/* Display the average rating of the code block */}
            <Rating
              value={block.rating} // Use the calculated average rating
              readOnly // Make it non-editable
              precision={0.1} // Show ratings with 0.1 precision
              sx={{ marginBottom: 2, color: '#f1c40f' }}
            />

            {/* Button to start coding */}
            <Button
              variant="contained"
              color="primary"
              onClick={() => navigate(`/codeblock/${block._id}`)} // Navigate to the selected code block page
            >
              Start Coding
            </Button>
          </Paper>
        ))}
      </Box>
    </Container>
  );
}

export default Lobby;
