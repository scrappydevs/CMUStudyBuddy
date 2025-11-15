# 3D Map Upgrade Notes

## What Changed

The 3D course visualization has been upgraded from a static node layout to a **force-directed graph** using the `r3f-forcegraph` library, inspired by modern visualization tools like Superhuman and Obsidian.

## Key Improvements

### 1. Force-Directed Layout
- Nodes now dynamically position themselves based on relationships
- Natural clustering of related courses
- Smooth animations and physics-based movement
- Better visual representation of course dependencies

### 2. Modern High-Tech Design
- **Dark theme** with gradient backgrounds
- **Glowing effects** on selected nodes
- **Color-coded courses** with vibrant palettes
- **Glassmorphism UI** panels with backdrop blur
- **Animated transitions** for all interactions

### 3. Enhanced Interactions
- **Hover effects** with color transitions
- **Click to select** with visual feedback
- **Directional arrows** on connections showing relationships
- **Curved links** for better visual flow
- **Interactive tooltips** with course information

### 4. Visual Features
- Multiple colored point lights for depth
- Gradient backgrounds with animated pulses
- Modern typography and spacing
- Responsive info panels
- Control legend overlay

## Technical Details

### Library Used
- **r3f-forcegraph**: React Three Fiber bindings for force-directed graphs
- Based on three-forcegraph and d3-force-3d
- Provides physics simulation and automatic layout

### Configuration
- `d3Force="d3"`: Uses D3 force simulation engine
- `d3AlphaDecay={0.0228}`: Controls simulation intensity decay
- `d3VelocityDecay={0.4}`: Simulates medium resistance
- `warmupTicks={100}`: Pre-renders layout before display
- `cooldownTime={15000}`: Auto-stops simulation after 15s

### Node Styling
- Size based on `nodeVal` (importance/complexity)
- Colors from course data with fallbacks
- Opacity and resolution tuned for clarity
- Emissive materials for glow effects

### Link Styling
- Curved connections (`linkCurvature={0.25}`)
- Directional arrows showing prerequisites
- Color changes based on selection state
- Semi-transparent for depth perception

## Installation

After pulling the changes, run:

```bash
npm install
```

This will install the new `r3f-forcegraph` dependency.

## Usage

The component API remains the same:

```tsx
<CourseMap3D 
  selectedCourse={selectedCourse}
  onCourseSelect={setSelectedCourse}
/>
```

The force graph automatically handles:
- Node positioning
- Link rendering
- Physics simulation
- Camera controls
- Interaction handling

## Performance

- Uses `useFrame` hook for efficient animation loops
- Memoized graph data to prevent unnecessary recalculations
- Optimized rendering with DPR scaling
- Auto-cooldown to save resources after interaction

## Future Enhancements

Potential improvements:
- Zoom to selected node animation
- Search/filter nodes
- Expand/collapse node groups
- Particle effects on links
- Node collision detection
- Custom node shapes (icons, images)
- Real-time data updates

