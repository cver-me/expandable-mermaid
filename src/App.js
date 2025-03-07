import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

// Demo mermaid text for the physics example
const PHYSICS_DEMO = `graph TD
  Level1["Main Concept: Physics"] --> Level2A["Mechanics"]
  Level1 --> Level2B["Electromagnetism"]
  Level1 --> Level2C["Quantum Physics"]
  Level2A --> Level3A1["Newton's Laws"]
  Level2A --> Level3A2["Conservation Laws"]
  Level2B --> Level3B1["Maxwell's Equations"]
  Level2B --> Level3B2["Electromagnetic Waves"]
  Level2C --> Level3C1["Wave-Particle Duality"]
  Level2C --> Level3C2["Quantum Measurement"]
  Level3A1 --> Level4A1A["First Law: Inertia"]
  Level3A1 --> Level4A1B["Second Law: F=ma"]
  Level3A1 --> Level4A1C["Third Law: Action-Reaction"]`;

// Main App Component
const App = () => {
  const [mermaidText, setMermaidText] = useState(PHYSICS_DEMO);
  const [inputText, setInputText] = useState(PHYSICS_DEMO);
  const [isEditing, setIsEditing] = useState(false);
  
  const handleApplyChanges = () => {
    setMermaidText(inputText);
  };
  
  const handleResetToDemo = () => {
    setInputText(PHYSICS_DEMO);
    setMermaidText(PHYSICS_DEMO);
  };
  
  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Expandable Mermaid Diagrams</h1>
      
      <div className="mb-4 flex justify-between items-center">
        <p>
          Click directly on any node to expand or collapse its children.
        </p>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
        >
          {isEditing ? "Hide Editor" : "Edit Diagram"}
        </button>
      </div>
      
      {isEditing && (
        <div className="mb-6 p-4 bg-gray-100 rounded shadow-md">
          <h2 className="text-lg font-semibold mb-2">Edit Mermaid Definition</h2>
          <textarea
            className="w-full h-64 p-2 border border-gray-300 rounded font-mono text-sm"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <button
              onClick={handleApplyChanges}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            >
              Apply Changes
            </button>
            <button
              onClick={handleResetToDemo}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition"
            >
              Reset to Demo
            </button>
          </div>
        </div>
      )}
      
      <div className="p-4 bg-white rounded shadow-md">
        <ExpandableMermaidRenderer mermaidText={mermaidText} />
      </div>
    </div>
  );
};

// Reusable ExpandableMermaidRenderer Component
// This can be exported separately for use in other projects
const ExpandableMermaidRenderer = ({ mermaidText }) => {
  const svgContainerRef = useRef(null);
  const [diagram, setDiagram] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({});
  const [mermaidLoaded, setMermaidLoaded] = useState(false);
  const [nodeHierarchy, setNodeHierarchy] = useState({});
  const [nodeLabels, setNodeLabels] = useState({});

  // Parse the mermaid text to extract nodes and their relationships
  useEffect(() => {
    if (mermaidText) {
      const extractedHierarchy = {};
      const extractedLabels = {};
      const allNodeIds = new Set();
      const definedNodeLabels = new Set();
      
      // First pass: identify all nodes and their labels
      const lines = mermaidText.split('\n');
      lines.forEach(line => {
        // Skip graph definition line, class definitions, etc.
        if (line.trim().startsWith('graph') || line.trim().startsWith('classDef') || line.trim() === '') {
          return;
        }
        
        // Extract all node definitions - including both sides of relationships
        // This regex looks for node definitions like NodeId["Label"] or NodeId[Label]
        const nodeDefRegex = /(\w+)\s*\[("?)([^\]]+?)\2\]/g;
        let match;
        while ((match = nodeDefRegex.exec(line)) !== null) {
          const nodeId = match[1];
          const nodeLabel = match[3];
          
          // Store all node IDs we encounter
          allNodeIds.add(nodeId);
          
          // Store the label
          if (nodeLabel && nodeLabel.trim() !== '') {
            extractedLabels[nodeId] = nodeLabel.trim();
            definedNodeLabels.add(nodeId);
          }
        }
        
        // Extract relationships (parent --> child)
        // This regex specifically looks for the arrow pattern
        const relationshipRegex = /(\w+)\s*-->\s*(\w+)/g;
        while ((match = relationshipRegex.exec(line)) !== null) {
          const parentId = match[1];
          const childId = match[2];
          
          // Register both nodes
          allNodeIds.add(parentId);
          allNodeIds.add(childId);
          
          // Add to hierarchy
          if (!extractedHierarchy[parentId]) {
            extractedHierarchy[parentId] = [];
          }
          if (!extractedHierarchy[parentId].includes(childId)) {
            extractedHierarchy[parentId].push(childId);
          }
        }
      });
      
      // Find or create a single root node to unify the diagram
      let rootNodeId = null;
      const rootCandidates = Array.from(allNodeIds).filter(nodeId => {
        // A root node is one that isn't a child of any other node
        return !Object.values(extractedHierarchy).some(children => children.includes(nodeId));
      });
      
      // If we only found one root, use it
      if (rootCandidates.length === 1) {
        rootNodeId = rootCandidates[0];
      }
      // If we found multiple roots, create connections to unify the diagram
      else if (rootCandidates.length > 1) {
        // Select the first root as the main root
        rootNodeId = rootCandidates[0];
        
        // Connect any other roots as children of the main root
        if (!extractedHierarchy[rootNodeId]) {
          extractedHierarchy[rootNodeId] = [];
        }
        
        for (let i = 1; i < rootCandidates.length; i++) {
          if (!extractedHierarchy[rootNodeId].includes(rootCandidates[i])) {
            extractedHierarchy[rootNodeId].push(rootCandidates[i]);
          }
        }
      }
      // If no roots were found (e.g., in a circular graph), pick any node
      else if (allNodeIds.size > 0) {
        rootNodeId = Array.from(allNodeIds)[0];
      }
      
      // Fill in any missing labels with node IDs
      allNodeIds.forEach(nodeId => {
        if (!definedNodeLabels.has(nodeId)) {
          extractedLabels[nodeId] = nodeId; // Use the ID as the label if none was provided
        }
      });
      
      // Initialize expanded states - only expand the root by default
      const initialExpandedState = {};
      if (rootNodeId) {
        initialExpandedState[rootNodeId] = true;
      }
      
      console.log('Parsed hierarchy:', extractedHierarchy);
      console.log('Parsed labels:', extractedLabels);
      console.log('Root node ID:', rootNodeId);
      
      setNodeHierarchy(extractedHierarchy);
      setNodeLabels(extractedLabels);
      setExpandedNodes(initialExpandedState);
      
      // Update the diagram with the parsed information
      setDiagram(mermaidText);
    }
  }, [mermaidText]);

  // Helper to check if a node should be visible
  const isNodeVisible = (nodeId) => {
    const parentNodeId = Object.keys(nodeHierarchy).find((parentId) =>
      nodeHierarchy[parentId].includes(nodeId)
    );
    if (!parentNodeId) return true;
    return expandedNodes[parentNodeId] && isNodeVisible(parentNodeId);
  };

  const getPlaceholder = (nodeId) => {
    if (nodeHierarchy[nodeId]) {
      return expandedNodes[nodeId] ? "[-]" : "[+]";
    }
    return "";
  };

  const generateMermaidDefinition = () => {
    // Use more advanced layout settings that work better with fixed container
    let definition = "graph TD\n  linkStyle default interpolate basis\n";

    Object.entries(nodeHierarchy).forEach(([parentId, childrenIds]) => {
      if (isNodeVisible(parentId)) {
        definition += `  ${parentId}["${nodeLabels[parentId]} ${getPlaceholder(
          parentId
        )}"]:::clickable\n`;
        if (expandedNodes[parentId]) {
          childrenIds.forEach((childId) => {
            if (isNodeVisible(childId)) {
              definition += `  ${parentId} --> ${childId}["${
                nodeLabels[childId]
              } ${getPlaceholder(childId)}"]:::clickable\n`;
            }
          });
        }
      }
    });
    definition +=
      "classDef clickable fill:#f9f,stroke:#333,stroke-width:2px;\n";
    return definition;
  };

  // Load Mermaid.js library
  useEffect(() => {
    if (typeof window !== "undefined" && !window.mermaid) {
      const script = document.createElement("script");
      script.src =
        "https://cdnjs.cloudflare.com/ajax/libs/mermaid/9.3.0/mermaid.min.js";
      script.async = true;
      script.onload = () => {
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "default",
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis'
          }
        });
        setMermaidLoaded(true);
      };
      document.body.appendChild(script);
      return () => {
        document.body.removeChild(script);
      };
    } else if (window.mermaid) {
      setMermaidLoaded(true);
    }
  }, []);

  // Render diagram whenever expanded nodes state changes
  useEffect(() => {
    if (mermaidLoaded) {
      // Using requestAnimationFrame ensures that any state updates have been processed
      // before we attempt to render the diagram
      requestAnimationFrame(() => {
        renderDiagram();
      });
    }
  }, [expandedNodes, mermaidLoaded]);

  const renderDiagram = () => {
    if (!svgContainerRef.current || !window.mermaid) return;

    const container = svgContainerRef.current;
    try {
      const definition = generateMermaidDefinition();
      setDiagram(definition);

      // We're using a fixed container size now
      // This keeps our references to prior code but will be used differently
      
      // Capture the current node positions and sizes before re-rendering
      const previousNodePositions = new Map();
      const previousNodes = new Set();
      
      if (container.querySelector("svg")) {
        container.querySelectorAll(".node").forEach((node) => {
          const nodeId = node.getAttribute("data-node-id");
          if (nodeId) {
            previousNodes.add(nodeId);
            
            // Store current position and size
            const rect = node.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            previousNodePositions.set(nodeId, {
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height
            });
          }
        });
      }
      
      // Remove any previous temporary containers
      container.querySelectorAll('.temp-svg-container').forEach(el => {
        container.removeChild(el);
      });
      
      // Create a container for the old SVG that will fade out
      const oldSvgContainer = document.createElement('div');
      oldSvgContainer.className = 'temp-svg-container';
      oldSvgContainer.style.position = 'absolute';
      oldSvgContainer.style.top = '0';
      oldSvgContainer.style.left = '0';
      oldSvgContainer.style.width = '100%';
      oldSvgContainer.style.height = '100%';
      oldSvgContainer.style.opacity = '1';
      oldSvgContainer.style.transition = 'opacity 0.3s ease';
      oldSvgContainer.style.pointerEvents = 'none';
      oldSvgContainer.style.zIndex = '1'; // Ensure it's above the container but below new content
      
      // Move the existing SVG to the old container to preserve it during transition
      const existingSvg = container.querySelector("svg");
      if (existingSvg) {
        // Clone the SVG but maintain clickable areas
        const clonedSvg = existingSvg.cloneNode(true);
        
        // Make sure all event handlers are removed from the clone to prevent double events
        clonedSvg.querySelectorAll(".node").forEach(node => {
          node.style.pointerEvents = 'none';
        });
        
        oldSvgContainer.appendChild(clonedSvg);
      }
      
      // Create a new container for the new SVG
      const newSvgContainer = document.createElement('div');
      newSvgContainer.className = 'temp-svg-container';
      newSvgContainer.style.position = 'relative';
      newSvgContainer.style.width = '100%';
      newSvgContainer.style.opacity = '0';
      newSvgContainer.style.transition = 'opacity 0.3s ease';
      newSvgContainer.style.zIndex = '2'; // Ensure it's on top
      
      // Clear the main container before adding our temporary containers
      container.innerHTML = '';
      container.appendChild(oldSvgContainer);
      container.appendChild(newSvgContainer);

      const id =
        "mermaid-diagram-" + Math.random().toString(36).substring(2, 11);
      // Calculate appropriate diagram sizing based on node count
      const visibleNodeCount = Object.keys(nodeLabels).filter(isNodeVisible).length;
      const minSize = Math.max(400, visibleNodeCount * 80); // Base size on visible nodes
      
      // Configure mermaid rendering with appropriate size constraints
      window.mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose',
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
          rankSpacing: 60,
          nodeSpacing: 40
        }
      });
      
      window.mermaid.render(id, definition, (svgCode) => {
        newSvgContainer.innerHTML = svgCode;

        const plusIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1V11" stroke="currentColor" stroke-width="2"/><path d="M1 6H11" stroke="currentColor" stroke-width="2"/></svg>`;
        const minusIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 6H11" stroke="currentColor" stroke-width="2"/></svg>`;

        const svgEl = newSvgContainer.querySelector("svg");
        if (!svgEl) return;

        let svgString = svgEl.outerHTML;
        svgString = svgString.replace(
          /\[\+\]/g,
          `<tspan class="expand-icon">${plusIcon}</tspan>`
        );
        svgString = svgString.replace(
          /\[-\]/g,
          `<tspan class="expand-icon">${minusIcon}</tspan>`
        );
        svgEl.outerHTML = svgString;

        // Re-select the SVG since we replaced it
        const updatedSvgEl = newSvgContainer.querySelector("svg");
        if (!updatedSvgEl) return;

        // Set width and height attributes on the SVG for proper sizing within container
        updatedSvgEl.setAttribute("width", "100%");
        updatedSvgEl.setAttribute("height", "100%");
        updatedSvgEl.style.maxWidth = "100%";
        updatedSvgEl.style.maxHeight = "100%";
        
        // Scale the SVG to fit within the container while maintaining aspect ratio
        const svgViewBox = updatedSvgEl.getAttribute('viewBox');
        if (!svgViewBox) {
          const bbox = updatedSvgEl.getBBox();
          if (bbox) {
            const viewBox = `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`;
            updatedSvgEl.setAttribute('viewBox', viewBox);
            updatedSvgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
          }
        }

        // Track current nodes for animation purposes
        const currentNodes = new Set();

        const nodeEls = updatedSvgEl.querySelectorAll(".node");
        
        // New map to track current positions
        const currentNodePositions = new Map();
        
        nodeEls.forEach((nodeEl) => {
          // Adjust text positioning
          const textEl = nodeEl.querySelector("text");
          if (textEl) {
            textEl.setAttribute("dominant-baseline", "middle");
            textEl.setAttribute("text-anchor", "start");
          }

          // Extract node ID from the node element
          let nodeId = extractNodeId(nodeEl);
          if (!nodeId) {
            console.log("Could not determine node ID for:", nodeEl.id);
            return;
          }

          currentNodes.add(nodeId);
          
          // Store current position for later reference
          const rect = nodeEl.getBoundingClientRect();
          const containerRect = container.getBoundingClientRect();
          currentNodePositions.set(nodeId, {
            x: rect.left - containerRect.left,
            y: rect.top - containerRect.top,
            width: rect.width,
            height: rect.height
          });
          
          // For existing nodes, prepare for a smooth transition from old to new position
          if (previousNodes.has(nodeId) && previousNodePositions.has(nodeId)) {
            const prevPos = previousNodePositions.get(nodeId);
            const currentTransform = nodeEl.getAttribute('transform') || '';
            
            // We won't actually apply these transforms yet, as the SVG is still hidden
            // This preparation is for the transition effect later
            nodeEl.setAttribute('data-original-transform', currentTransform);
            nodeEl.setAttribute('data-prev-pos', JSON.stringify(prevPos));
          } 
          // For new nodes, prepare them to fade in
          else if (!previousNodes.has(nodeId)) {
            nodeEl.style.opacity = '0';
          }

          // Set visual styles and attributes
          nodeEl.style.cursor = "pointer";
          nodeEl.setAttribute(
            "aria-expanded",
            expandedNodes[nodeId] ? "true" : "false"
          );
          nodeEl.setAttribute("role", "treeitem");
          nodeEl.setAttribute("data-node-id", nodeId);

          if (expandedNodes[nodeId]) {
            nodeEl.classList.add("expanded-node");
          } else {
            nodeEl.classList.remove("expanded-node");
          }

          if (nodeHierarchy[nodeId]) {
            const rect = nodeEl.querySelector("rect");
            if (rect) {
              rect.setAttribute("stroke-width", "3");
              rect.setAttribute(
                "stroke",
                expandedNodes[nodeId] ? "#00aa00" : "#9900cc"
              );
            }
          }

          // Add click event handler with animation
          nodeEl.addEventListener("click", (event) => {
            event.stopPropagation(); // Prevent event bubbling
            const clickedNodeId = nodeEl.getAttribute("data-node-id");
            if (clickedNodeId && nodeHierarchy[clickedNodeId] !== undefined) {
              // Animate the clicked node
              const isExpanding = !expandedNodes[clickedNodeId];

              // Visual feedback on click
              const rect = nodeEl.querySelector("rect");
              if (rect) {
                rect.style.transform = "scale(1.05)";
                setTimeout(() => {
                  rect.style.transform = "scale(1)";
                }, 200);
              }

              // Toggle the node state with animation
              animateNodeToggle(clickedNodeId, isExpanding);
            }
          });
        });

        // Apply animations to edges
        const edgeEls = updatedSvgEl.querySelectorAll(".edge");
        edgeEls.forEach((edge) => {
          // Initially hide all edges
          edge.style.opacity = '0';
        });
        
        // Final step: Orchestrate the transition
        // Add a slight delay to ensure all measurements and prep are complete
        setTimeout(() => {
          // First ensure we've completed the initial rendering
          requestAnimationFrame(() => {
            // Fade out the old SVG with a slight delay to allow the new SVG to be ready
            if (oldSvgContainer) {
              oldSvgContainer.style.opacity = '0';
            }
          
          // Fade in the new SVG
          newSvgContainer.style.opacity = '1';
          
          // Apply transitions to all nodes based on their previous positions
          nodeEls.forEach(nodeEl => {
            const nodeId = nodeEl.getAttribute("data-node-id");
            if (!nodeId) return;
            
            // Smooth transition for existing nodes
            if (previousNodes.has(nodeId) && nodeEl.hasAttribute('data-prev-pos')) {
              nodeEl.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
              nodeEl.style.opacity = '1';
            } 
            // Fade in new nodes
            else if (!previousNodes.has(nodeId)) {
              nodeEl.style.transition = 'opacity 0.4s ease';
              nodeEl.style.opacity = '1';
            }
          });
          
          // Fade in edges gradually, starting with main level connections
          // This creates a more organic expansion effect
          const edgesByLevel = {};
          edgeEls.forEach(edge => {
            // Try to determine the edge level based on parent-child relationship
            const [source, target] = edge.id.match(/flowchart-(Level\d+[A-Z0-9]*)/g) || [];
            if (source && target) {
              const sourceId = source.replace('flowchart-', '');
              const targetId = target.replace('flowchart-', '');
              
              // Calculate level based on how deep the nodes are
              const level = Math.max(
                sourceId.match(/\d+/g) ? parseInt(sourceId.match(/\d+/g)[0]) : 1,
                targetId.match(/\d+/g) ? parseInt(targetId.match(/\d+/g)[0]) : 1
              );
              
              if (!edgesByLevel[level]) {
                edgesByLevel[level] = [];
              }
              edgesByLevel[level].push(edge);
            } else {
              // Default for edges we can't determine the level
              if (!edgesByLevel[999]) {
                edgesByLevel[999] = [];
              }
              edgesByLevel[999].push(edge);
            }
          });
          
          // Animate edges by level with a small delay between levels
          Object.keys(edgesByLevel).sort((a, b) => a - b).forEach((level, levelIndex) => {
            edgesByLevel[level].forEach((edge, edgeIndex) => {
              setTimeout(() => {
                edge.style.transition = 'opacity 0.4s ease';
                edge.style.opacity = '1';
              }, levelIndex * 50 + edgeIndex * 5); // Level delay + small stagger within level
            });
          });
          
          // Clean up all temporary containers after transition is complete
          setTimeout(() => {
            // Remove the old container
            if (oldSvgContainer && oldSvgContainer.parentNode) {
              oldSvgContainer.parentNode.removeChild(oldSvgContainer);
            }
            
            // Move the contents of the new container to the main container
            if (newSvgContainer && newSvgContainer.parentNode) {
              const svg = newSvgContainer.querySelector('svg');
              if (svg) {
                // Remove the container but keep its child SVG
                container.appendChild(svg);
                newSvgContainer.parentNode.removeChild(newSvgContainer);
              }
            }
          }, 400);
          
          });
        }, 100); // Increased delay to ensure DOM is fully ready
      });
    } catch (error) {
      console.error("Mermaid rendering error:", error);
    }
  };

  // Helper function to animate container changes - we're now using fixed container
  // But we'll keep this to avoid breaking existing code
  const animateContainerHeight = (container, newHeight) => {
    // Now with fixed container, we don't need to change the height
    // But we can use this to trigger other animations if needed
    return;
  };

  // Helper function to animate node toggling
  const animateNodeToggle = (nodeId, isExpanding) => {
    console.log(`${isExpanding ? "Expanding" : "Collapsing"} node:`, nodeId);
    
    // Whether expanding or collapsing, we'll immediately update the state
    // This ensures consistent behavior and prevents the (0,0) positioning issue
    toggleNode(nodeId);
    
    // A pre-emptive minimal delay helps with rendering coordination
    setTimeout(() => {
      // Force a re-render if needed by touching a DOM property
      if (svgContainerRef.current) {
        const computedStyle = window.getComputedStyle(svgContainerRef.current);
        // Reading the offsetHeight forces a reflow
        svgContainerRef.current.offsetHeight;
      }
    }, 5);
  };

  // Helper function to extract node ID
  const extractNodeId = (nodeEl) => {
    // First try to extract from text content
    const textEls = nodeEl.querySelectorAll("text");
    for (const textEl of textEls) {
      const labelText = textEl.textContent.replace(/\[\+\]|\[-\]/g, "").trim();

      const matchingNodeId = Object.entries(nodeLabels).find(
        ([, label]) => label === labelText
      );

      if (matchingNodeId) {
        return matchingNodeId[0];
      }
    }

    // If that fails, try to extract from node ID
    const patterns = [
      /flowchart-(Level\d+[A-Z0-9]*)/,
      /node-(Level\d+[A-Z0-9]*)/,
      /(Level\d+[A-Z0-9]*)/,
    ];

    for (const pattern of patterns) {
      const match = nodeEl.id.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  };

  const toggleNode = (nodeId) => {
    if (nodeHierarchy[nodeId] !== undefined) {
      // Get all child nodes that will be affected by this toggle
      const childrenToAnimate = getDescendantNodes(nodeId);
      
      // Create a visual marker of the current state of the diagram for animation reference
      const container = svgContainerRef.current;
      if (container && container.querySelector('svg')) {
        // Mark the specific node being toggled for special handling
        const nodeToToggle = container.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeToToggle) {
          nodeToToggle.setAttribute('data-toggle-operation', 'true');
        }
      }

      setExpandedNodes((prev) => {
        const isExpanding = !prev[nodeId];
        const newState = { ...prev, [nodeId]: isExpanding };
        console.log("New expanded state:", newState);
        return newState;
      });
    }
  };

  // Helper function to get all descendant nodes
  const getDescendantNodes = (nodeId) => {
    const descendants = [];

    const addChildren = (parentId) => {
      const children = nodeHierarchy[parentId] || [];
      children.forEach((childId) => {
        descendants.push(childId);
        addChildren(childId);
      });
    };

    addChildren(nodeId);
    return descendants;
  };

  return (
    <div>
      <div 
        className="diagram-fixed-container"
        style={{
          width: '100%',
          height: '500px', // Fixed height container
          border: '1px solid #eaeaea',
          borderRadius: '4px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          ref={svgContainerRef}
          className="mermaid-container transition-max-height"
          style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            overflow: 'auto'
          }}
        ></div>
      </div>
      {diagram && (
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h2 className="text-lg font-semibold mb-2">
            Current Mermaid Definition
          </h2>
          <pre className="bg-gray-800 text-white p-2 rounded text-sm overflow-auto">
            {diagram}
          </pre>
        </div>
      )}
    </div>
  );
};

export default App;
