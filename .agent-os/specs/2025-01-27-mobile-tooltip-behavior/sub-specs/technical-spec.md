# Technical Specification

This is the technical specification for the spec detailed in @.agent-os/specs/2025-01-27-mobile-tooltip-behavior/spec.md

> Created: 2025-01-27
> Version: 1.0.0

## Technical Requirements

### Mobile Detection
- Use existing `useIsMobile()` hook (768px breakpoint) for consistent device detection
- Implement responsive tooltip behavior based on device type detection
- Ensure detection works correctly during window resize events

### Tooltip Interaction Patterns
- **Touch Devices**: Click/tap to open popover, click outside or second tap to close
- **Non-Touch Devices**: Hover to open tooltip + Click to open/close persistent tooltip
- **Keyboard Navigation**: Enter/Space to open, Escape to close (all device types)

### State Management
- Implement controlled tooltip state for mobile interactions
- Ensure only one mobile tooltip is open at a time
- Maintain existing uncontrolled behavior for desktop hover

### Component Integration
- Modify existing shadcn/ui Tooltip component without breaking changes
- Preserve all existing props and API compatibility
- Apply changes globally through component enhancement

## Approach Options

**Option A: Enhanced HybridTooltip Approach** (Selected)
- Create `HybridTooltip` component that uses Popover on touch devices and enhanced Tooltip on non-touch devices
- Non-touch devices get both hover AND click functionality for maximum flexibility
- Uses `window.matchMedia('(pointer: coarse)')` to detect touch devices
- Pros: Best of both worlds, maximum user flexibility, leverages existing components
- Cons: More complex desktop interaction logic, requires careful event coordination

**Option B: Pure HybridTooltip Approach**
- Create `HybridTooltip` component that uses Popover on mobile and standard Tooltip on desktop
- Desktop only gets hover functionality (original Stack Overflow solution)
- Pros: Clean separation, simpler implementation, proven solution
- Cons: Desktop users miss out on click-to-persist functionality

**Option C: Controlled Tooltip with Manual Events**
- Use controlled Tooltip state with manual event handlers (onClick, onTouchStart, onMouseEnter)
- Single component handles both mobile and desktop interactions
- Pros: Consistent visual appearance, single component, proven solution
- Cons: More complex event handling, potential for event conflicts

**Option C: Custom Hook Wrapper**
- Create `useMobileTooltip()` hook that wraps existing tooltip logic
- Pros: Non-invasive, easy to implement, maintains existing API
- Cons: Requires manual integration in each component, potential inconsistency

**Rationale:** Option A (Enhanced HybridTooltip) is selected to provide the best user experience across all devices. It combines the proven Stack Overflow solution with enhanced desktop functionality. Touch devices get reliable popover interactions, while non-touch devices get both hover (for quick access) and click (for persistent tooltips) functionality. This approach maximizes user flexibility and addresses all interaction preferences.

## Implementation Strategy

### Phase 1: Enhanced HybridTooltip Component Creation
1. Create `TouchProvider` context for touch device detection using `window.matchMedia('(pointer: coarse)')`
2. Create `HybridTooltip` component that renders Popover on touch devices, enhanced Tooltip on non-touch devices
3. Create `HybridTooltipTrigger` with dual hover+click functionality for non-touch devices
4. Create `HybridTooltipContent` wrapper components for both interaction modes
5. Implement `HybridTooltipProvider` with optimized delay settings

### Phase 2: Touch Detection System
1. Implement touch detection using CSS media query `(pointer: coarse)`
2. Add TouchProvider context to application root layout
3. Ensure touch detection works correctly across different devices
4. Handle edge cases for hybrid devices (laptops with touchscreens)

### Phase 3: Global Integration and Migration
1. Create migration path from existing Tooltip usage to HybridTooltip
2. Update all existing tooltip instances to use HybridTooltip components
3. Ensure backward compatibility and consistent behavior
4. Test all tooltip instances across mobile and desktop devices

## External Dependencies

**No new dependencies required** - Implementation uses existing libraries and patterns:
- **Existing**: Radix UI Tooltip primitives (already in use via shadcn/ui)
- **Existing**: Radix UI Popover primitives (already in use via shadcn/ui)
- **Existing**: React Context and useState for touch detection
- **Existing**: CSS media queries for touch device detection
- **Existing**: TailwindCSS for styling consistency

## Technical Implementation Details

### Component Structure (Based on Stack Overflow Solution)
```typescript
// Touch detection context
const TouchContext = createContext<boolean | undefined>(undefined);
const useTouch = () => useContext(TouchContext);

const TouchProvider = (props: PropsWithChildren) => {
  const [isTouch, setTouch] = useState<boolean>();

  useEffect(() => {
    setTouch(window.matchMedia('(pointer: coarse)').matches);
  }, []);

  return <TouchContext.Provider value={isTouch} {...props} />;
};

// Enhanced hybrid tooltip components
const HybridTooltip = (props: TooltipProps & PopoverProps) => {
  const isTouch = useTouch();
  return isTouch ? <Popover {...props} /> : <EnhancedTooltip {...props} />;
};

const HybridTooltipTrigger = (props: TooltipTriggerProps & PopoverTriggerProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverTrigger {...props} /> : <EnhancedTooltipTrigger {...props} />;
};

const HybridTooltipContent = (props: TooltipContentProps & PopoverContentProps) => {
  const isTouch = useTouch();
  return isTouch ? <PopoverContent {...props} /> : <TooltipContent {...props} />;
};

// Enhanced tooltip for non-touch devices with hover + click functionality
const EnhancedTooltip = (props: TooltipProps) => {
  const [clickOpen, setClickOpen] = useState(false);

  return (
    <Tooltip open={clickOpen || undefined} {...props}>
      {/* Hover works naturally, click state overrides when active */}
    </Tooltip>
  );
};

const EnhancedTooltipTrigger = (props: TooltipTriggerProps) => {
  return (
    <TooltipTrigger
      {...props}
      onClick={(e) => {
        // Handle click for persistent tooltip
        setClickOpen(!clickOpen);
        props.onClick?.(e);
      }}
      // Hover behavior remains unchanged
    />
  );
};
```

### Touch Device Detection
- Uses CSS media query `(pointer: coarse)` to detect touch devices
- More reliable than screen size or user agent detection
- Handles hybrid devices (laptops with touchscreens) correctly
- Updates automatically when device capabilities change

### Mobile Behavior (Popover-based)
- Click/tap to open popover
- Click outside or on trigger again to close
- Supports keyboard navigation (Enter, Space, Escape)
- Proper focus management and ARIA attributes

### Desktop Behavior (Enhanced Tooltip-based)
- **Hover Interaction**: Maintains existing hover behavior for quick access
- **Click Interaction**: Adds click-to-persist functionality for longer reading
- **Dual Mode**: Hover shows tooltip temporarily, click makes it persistent until clicked again or outside click
- **State Management**: Controlled state for click interactions, uncontrolled for hover
- **Multiple Tooltips**: Hover tooltips can be multiple, click tooltips are single (like mobile)

## Testing Requirements

### Device Testing
- Mobile devices (iOS Safari, Android Chrome)
- Tablet devices (iPad, Android tablets)
- Desktop browsers (Chrome, Firefox, Safari, Edge)
- Responsive design testing (browser dev tools)

### Interaction Testing
- Click/tap to open on mobile
- Click outside to close on mobile
- Hover behavior on desktop
- Keyboard navigation on all devices
- Screen reader compatibility

### Component Integration Testing
- All existing tooltip instances work correctly
- No breaking changes to existing functionality
- Consistent behavior across all application areas

## Performance Considerations

### Minimal Performance Impact
- Device detection happens once per component mount
- No additional network requests or heavy computations
- Reuse existing React patterns and hooks

### Memory Management
- Proper cleanup of event listeners for click-outside detection
- State management limited to mobile tooltip instances only
- No memory leaks from tooltip state management
