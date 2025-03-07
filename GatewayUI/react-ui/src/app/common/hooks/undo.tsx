import { useEffect } from 'react';

const useUndoShortcut = (undoAction: () => void) => {
	useEffect(() => {
	  const handleKeyDown = (event: KeyboardEvent) => {
		// Check if Cmd+Z (on macOS) or Ctrl+Z (on Windows) is pressed
		if ((event.metaKey || event.ctrlKey) && event.key === 'z') {
		  event.preventDefault(); // Prevent default browser undo action
		  undoAction(); // Call the undo action
		}
	  };
  
	  // Add the event listener when the component is mounted
	  window.addEventListener('keydown', handleKeyDown);
  
	  // Clean up the event listener when the component is unmounted
	  return () => {
		window.removeEventListener('keydown', handleKeyDown);
	  };
	}, [undoAction]); // Only re-run the effect if the undoAction changes
  };
  
  export default useUndoShortcut;