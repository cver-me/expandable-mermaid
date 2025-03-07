import React, { useState, useEffect, useRef } from "react";
import "./styles.css";

const ExpandableMermaid = () => {
  const svgContainerRef = useRef(null);
  const [diagram, setDiagram] = useState(null);
  const [expandedNodes, setExpandedNodes] = useState({ Level1: true });
  const [mermaidLoaded, setMermaidLoaded] = useState(false);

  const nodeHierarchy = {
    Level1: ["Level2A", "Level2B", "Level2C"],
    Level2A: ["Level3A1", "Level3A2"],
    Level2B: ["Level3B1", "Level3B2"],
    Level2C: ["Level3C1", "Level3C2"],
    Level3A1: ["Level4A1A", "Level4A1B", "Level4A1C"],
  };

  const nodeLabels = {
    Level1: "Main Concept: Physics",
    Level2A: "Mechanics",
    Level2B: "Electromagnetism",
    Level2C: "Quantum Physics",
    Level3A1: "Newton's Laws",
    Level3A2: "Conservation Laws",
    Level3B1: "Maxwell's Equations",
    Level3B2: "Electromagnetic Waves",
    Level3C1: "Wave-Particle Duality",
    Level3C2: "Quantum Measurement",
    Level4A1A: "First Law: Inertia",
    Level4A1B: "Second Law: F=ma",
    Level4A1C: "Third Law: Action-Reaction",
  };

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
    let definition = "graph TD\n";

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
      renderDiagram();
    }
  }, [expandedNodes, mermaidLoaded]);

  const renderDiagram = () => {
    if (!svgContainerRef.current || !window.mermaid) return;

    const container = svgContainerRef.current;
    try {
      const definition = generateMermaidDefinition();
      setDiagram(definition);

      const visibleNodeCount =
        Object.keys(nodeLabels).filter(isNodeVisible).length;
      const estimatedNodeHeight = 40;
      const padding = 20;

      // Use animation for height changes
      const newHeight = `${visibleNodeCount * estimatedNodeHeight + padding}px`;
      animateContainerHeight(container, newHeight);

      // Store previous diagram structure for animation comparison
      const previousNodes = new Set();
      if (container.querySelector("svg")) {
        container.querySelectorAll(".node").forEach((node) => {
          const nodeId = node.getAttribute("data-node-id");
          if (nodeId) previousNodes.add(nodeId);
        });
      }

      // Clear previous content before rendering
      container.innerHTML = "";

      const id =
        "mermaid-diagram-" + Math.random().toString(36).substring(2, 11);
      window.mermaid.render(id, definition, (svgCode) => {
        container.innerHTML = svgCode;

        const plusIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 1V11" stroke="currentColor" stroke-width="2"/><path d="M1 6H11" stroke="currentColor" stroke-width="2"/></svg>`;
        const minusIcon = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 6H11" stroke="currentColor" stroke-width="2"/></svg>`;

        const svgEl = container.querySelector("svg");
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
        const updatedSvgEl = container.querySelector("svg");
        if (!updatedSvgEl) return;

        // Set width and height attributes on the SVG to make it responsive
        updatedSvgEl.setAttribute("width", "100%");
        updatedSvgEl.style.maxWidth = "100%";

        // Track current nodes for animation purposes
        const currentNodes = new Set();

        const nodeEls = updatedSvgEl.querySelectorAll(".node");
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

          // Apply animation class for new nodes
          if (!previousNodes.has(nodeId)) {
            nodeEl.classList.add("node-expanding");
            setTimeout(() => {
              nodeEl.classList.remove("node-expanding");
            }, 400);
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
          edge.classList.add("edge-appearing");
          setTimeout(() => {
            edge.classList.remove("edge-appearing");
          }, 400);
        });
      });
    } catch (error) {
      console.error("Mermaid rendering error:", error);
    }
  };

  // Helper function to animate height changes
  const animateContainerHeight = (container, newHeight) => {
    const currentHeight = container.style.maxHeight;
    if (currentHeight !== newHeight) {
      container.style.maxHeight = newHeight;
    }
  };

  // Helper function to animate node toggling
  const animateNodeToggle = (nodeId, isExpanding) => {
    console.log(`${isExpanding ? "Expanding" : "Collapsing"} node:`, nodeId);

    // Apply the toggle with a slight delay to allow animation to be visible
    setTimeout(() => {
      toggleNode(nodeId);
    }, 50);
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
    <div className="w-full max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Interactive Study Map</h1>
      <p className="mb-4">
        Click directly on any node to expand or collapse its children.
      </p>
      <div className="p-4 bg-white rounded shadow-md">
        <div
          ref={svgContainerRef}
          className="mermaid-container transition-max-height"
        ></div>
      </div>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <h2 className="text-lg font-semibold mb-2">
          Current Mermaid Definition
        </h2>
        <pre className="bg-gray-800 text-white p-2 rounded text-sm overflow-auto">
          {diagram}
        </pre>
      </div>
    </div>
  );
};

export default ExpandableMermaid;
