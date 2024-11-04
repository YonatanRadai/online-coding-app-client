// CodeBlockPage.js
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import AceEditor from 'react-ace';
import ace from 'ace-builds';
import { AppBar, Toolbar, Typography, Container, Paper, Box, IconButton, Rating, CircularProgress } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import { debounce } from 'lodash';

import 'ace-builds/src-noconflict/mode-javascript';
import 'ace-builds/src-noconflict/theme-monokai';

ace.config.setModuleUrl('ace/mode/javascript_worker', 'https://cdnjs.cloudflare.com/ajax/libs/ace/1.4.12/worker-javascript.js');

// Imports Section Notes:
// - React hooks like `useState`, `useEffect`, and `useRef` manage state and handle side effects in the component.
// - `useParams` is used to extract parameters from the URL, while `useNavigate` allows for programmatic navigation.
// - `socket.io-client` establishes a WebSocket connection for real-time communication with the server.
// - `AceEditor` is a code editor component that integrates Ace's functionality for displaying and editing JavaScript code.
// - Material UI components are used to create a styled and responsive user interface, with elements like `AppBar`, `Toolbar`, and `Rating`.
// - `debounce` from Lodash helps limit how often the `handleCodeChange` function is called, optimizing performance.

let socket; // This holds the WebSocket connection to the backend.

function CodeBlockPage(props) {
  const url = props.url
  const { id } = useParams(); // Extracts the session ID from the URL.
  const navigate = useNavigate(); // Allows navigating to other pages.
  
  // State Variables:
  const [codeBlock, setCodeBlock] = useState(null); // Stores the current code block metadata (e.g., name, initial code).
  const [role, setRole] = useState('student'); // User's role in the session (student/mentor).
  const [studentsCount, setStudentsCount] = useState(0); // Number of students in the session.
  const [code, setCode] = useState(''); // The actual code being edited in AceEditor.
  const [rating, setRating] = useState(0);  // Average rating for the current code block.
  const [userRating, setUserRating] = useState(null);  // The rating given by the current user.
  const [isRated, setIsRated] = useState(false);  // Whether the user has already rated the code block.
  const [showSmiley, setShowSmiley] = useState(false);  // Whether to show a smiley face when the solution is correct.
  const [isHovering, setIsHovering] = useState(false);  // Tracks if the user is hovering over the rating component.
  const [loadingCodeBlock, setLoadingCodeBlock] = useState(true);  // Tracks whether the code block is still loading.

  const codeRef = useRef('');  // A ref to store the current code, allowing updates without causing re-renders.

  // useEffect Hook:
  // - Fetches the code block's initial data (e.g., name, initial code) from the server when the component mounts.
  // - Fetches the average rating for the code block.
  // - Initializes the WebSocket connection if it doesn't already exist.
  // - Sets up WebSocket event listeners to handle real-time updates like receiving the updated code from other students.
  // - Cleans up the WebSocket connection when the component unmounts.
  useEffect(() => {
  // 1) Fetching:
    // Fetch the code block's metadata and initial code.
    fetch(url + `/api/codeblock/${id}`)
      .then((res) => res.json())
      .then((data) => {
        setCodeBlock(data); // Store the code block metadata.
        setCode(data.initialCode); // Set the code to the initial value.
        codeRef.current = data.initialCode; // Sync the ref with the current code.
        setLoadingCodeBlock(false); // Stop showing the loading spinner.
      });

    // Fetch the average rating for the code block.
    fetch(url + `/api/codeblock/${id}/rating`)
      .then((res) => res.json())
      .then((data) => {
        setRating(data.averageRating); // Store the average rating.
      });

  // 2) WebSocket:
    if (!socket) {
      socket = io(url); // Establish WebSocket connection.
    }

    socket.emit('joinCodeBlock', id); // Notify the server that this client is joining the code block session.

    // WebSocket event listeners:
    // - `role`: Receives the assigned role (student/mentor) from the server.
    socket.on('role', (assignedRole) => setRole(assignedRole));

    // - `codeUpdate`: Receives real-time code updates from the server when other users make changes.
    socket.on('codeUpdate', (newCode) => {
      if (newCode.includes('/* SOLUTION MATCHED */')) {
        setShowSmiley(true); // Show the smiley icon if the solution is correct.
      } else {
        setShowSmiley(false); // Hide the smiley if the solution is not matched.
      }

      // Update the code only if the new code is different from the current code and is not empty.
      if (newCode !== codeRef.current && newCode !== '') {
        setCode(newCode); // Update the code.
        codeRef.current = newCode; // Sync the ref with the new code.
      }
    });

    // - `studentsCountUpdate`: Updates the number of students in the session when it changes.
    socket.on('studentsCountUpdate', (count) => setStudentsCount(count));

    // - `mentorLeft`: Handles the case when the mentor leaves the session and redirects users to the lobby.
    socket.on('mentorLeft', () => {
      alert('Mentor has left the session. Redirecting to the lobby...');
      navigate('/');
    });

    // Clean up the WebSocket connection when the component unmounts.
    return () => {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [id, navigate]);

  // handleCodeChange:
  // - This function is called whenever the user edits the code in the AceEditor.
  // - It uses `debounce` to delay emitting changes to the server to avoid too frequent updates.
  // - If the code matches the solution, it appends '/* SOLUTION MATCHED */' and shows a smiley face.
  const handleCodeChange = debounce((newCode) => {
    if (newCode.trim() !== '') {
      setCode(newCode); // Update the code state.
      codeRef.current = newCode; // Sync the ref with the new code.

      if (newCode.trim() === codeBlock.solution.trim()) {
        newCode = `${newCode} /* SOLUTION MATCHED */`; // Mark the solution as matched.
        setShowSmiley(true); // Show the smiley.
      }
      socket.emit('codeChange', newCode); // Emit the updated code to the server.
    }
  }, 300);

  // handleRatingChange:
  // - Handles changes to the user's rating of the code block.
  // - Sends the rating to the server if the user has not already rated the session.
  const handleRatingChange = (newValue) => {
    if (!isRated) {
      setUserRating(newValue); // Set the user's rating.
      setIsRated(true); // Mark the session as rated.

      // Send the rating to the server.
      fetch(url + `/api/codeblock/${id}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating: newValue })
      })
        .then((res) => res.json())
        .then((data) => {
          setRating(data.averageRating); // Update the average rating.
        });
    }
  };

  // handleMouseEnter and handleMouseLeave:
  // - These functions handle the hover state for the rating component, allowing users to interact with the rating when hovering.
  const handleMouseEnter = () => {
    setIsHovering(true); // Enable hover state.
  };

  const handleMouseLeave = () => {
    setIsHovering(false); // Disable hover state.
  };

  // Show a loading spinner while the code block is being fetched.
  if (loadingCodeBlock) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div>
      {/* AppBar: Displays the session's title, rating, and student information */}
      <AppBar position="static" sx={{ backgroundColor: 'background.paper' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, color: 'text.primary' }}>
            Code Block: {codeBlock.codeBlockName}
          </Typography>

          {/* Displays the difficulty rating */}
          <Typography variant="body1" sx={{ color: 'text.secondary', marginRight: 1 }}>
            Difficulty:
          </Typography>

          {/* Rating component with hover interaction */}
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {!isHovering && (
              <Rating
                value={rating}
                readOnly
                max={5}
                precision={0.1}
                sx={{ color: '#f1c40f', marginRight: 2 }}
              />
            )}
            {isHovering && !isRated && (
              <Rating
                value={userRating}
                onChange={(event, newValue) => handleRatingChange(newValue)}
                max={5}
                precision={1}
                sx={{ color: '#f1c40f', marginRight: 2 }}
              />
            )}
            {isHovering && isRated && (
              <Rating
                value={rating}
                readOnly
                max={5}
                precision={0.1}
                sx={{ color: '#f1c40f', marginRight: 2 }}
              />
            )}
          </div>

          {/* Shows the number of students and the user's role */}
          <Typography variant="body1" sx={{ marginRight: 2, color: 'text.secondary' }}>
            Students: {studentsCount} | Role: {role.charAt(0).toUpperCase() + role.slice(1)}
          </Typography>

          {/* Close icon to navigate back to the lobby */}
          <IconButton color="inherit" onClick={() => navigate('/')}>
            <CloseIcon />
          </IconButton>
        </Toolbar>
      </AppBar>

      {/* Code Editor or Smiley Icon depending on the solution status */}
      <Container maxWidth="md">
        <Paper sx={{ marginTop: 3, padding: 3, backgroundColor: 'background.paper', borderRadius: 2 }}>
          {showSmiley ? (
            <Box mt={2} display="flex" justifyContent="center" alignItems="center" height="500px">
              <EmojiEmotionsIcon style={{ fontSize: '10rem', color: '#f1c40f' }} />
            </Box>
          ) : (
            <AceEditor
              mode="javascript"
              theme="monokai"
              value={code}
              onChange={handleCodeChange}
              name="codeEditor"
              editorProps={{ $blockScrolling: true }}
              width="100%"
              height="500px"
              readOnly={role === 'mentor'} // Mentors can't edit the code.
            />
          )}
        </Paper>
      </Container>
    </div>
  );
}

export default CodeBlockPage;
