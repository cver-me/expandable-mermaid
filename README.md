# Expandable Mermaid

An interactive React component for creating expandable and collapsible hierarchical diagrams using Mermaid.js.

## Overview

This project provides a dynamic and interactive way to visualize hierarchical data structures. It extends the capabilities of Mermaid.js by adding expand/collapse functionality to nodes, allowing users to explore complex hierarchies more intuitively.

## Features

- 📊 **Interactive Node Expansion**: Click on any node to expand or collapse its children
- 🎯 **Visual Feedback**: Smooth animations when expanding/collapsing nodes
- 🔄 **Dynamic Rendering**: Diagram automatically updates when node states change
- 🎨 **Custom Styling**: Different colors for expanded/collapsed nodes
- 📱 **Responsive Design**: Adapts to different screen sizes

## Demo

The current implementation demonstrates an interactive physics concept map where:

- Users can expand/collapse different physics topics
- Visual indicators show which nodes can be expanded
- Clicking on nodes provides visual feedback
- The diagram animates smoothly during transitions

## Technologies

- React (Hooks: useState, useEffect, useRef)
- Mermaid.js for diagram rendering
- Dynamic SVG manipulation
- CSS transitions for animations

## Getting Started

### Prerequisites

- Node.js and npm

### Installation

```bash
# Clone the repository
git clone https://github.com/cver-me/expandable-mermaid.git
cd expandable-mermaid

# Install dependencies
npm install

# Start the development server
npm start
```

## Usage

The component can be customized by modifying the node hierarchy and labels in the `App.js` file:

```javascript
const nodeHierarchy = {
  Level1: ["Level2A", "Level2B", "Level2C"],
  Level2A: ["Level3A1", "Level3A2"],
  // ... add your own hierarchy
};

const nodeLabels = {
  Level1: "Main Concept",
  Level2A: "Subconcept A",
  // ... add your own labels
};
```

## License

This project is open source and available under the MIT License.
