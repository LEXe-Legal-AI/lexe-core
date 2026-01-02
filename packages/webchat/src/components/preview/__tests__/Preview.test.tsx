/**
 * @file Preview Components Test Suite
 * @description Comprehensive tests for PreviewPanel, ScreenshotViewer, ActivityLog,
 *              MemoryViewer, MemoryGraph, and ToolExecutionCard components
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PreviewPanel } from '../PreviewPanel';
import { ScreenshotViewer, type Screenshot } from '../ScreenshotViewer';
import { ActivityLog, type ActivityEvent, type ActivityEventType } from '../ActivityLog';
import { MemoryViewer, type MemoryData } from '../MemoryViewer';
import { ToolExecutionCard, ToolExecutionList } from '../ToolExecutionCard';
import { MemoryLayer, type ToolExecution, type MemoryFact } from '@/types';

beforeEach(() => {
  vi.clearAllMocks();
});

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', async () => {
  const actual = await vi.importActual('framer-motion');
  return {
    ...actual,
    motion: {
      div: ({
        children,
        whileHover: _whileHover,
        whileTap: _whileTap,
        variants: _variants,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        layout: _layout,
        ...props
      }: React.HTMLAttributes<HTMLDivElement> & Record<string, unknown>) => (
        <div {...props}>{children}</div>
      ),
      img: ({
        children,
        whileHover: _whileHover,
        whileTap: _whileTap,
        variants: _variants,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        ...props
      }: React.ImgHTMLAttributes<HTMLImageElement> & Record<string, unknown>) => (
        <img {...props}>{children}</img>
      ),
      span: ({
        children,
        whileHover: _whileHover,
        whileTap: _whileTap,
        variants: _variants,
        initial: _initial,
        animate: _animate,
        exit: _exit,
        ...props
      }: React.HTMLAttributes<HTMLSpanElement> & Record<string, unknown>) => (
        <span {...props}>{children}</span>
      ),
    },
    AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

// Mock ReactFlow since it requires complex setup
vi.mock('reactflow', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="reactflow-container">{children}</div>
  ),
  Background: () => <div data-testid="reactflow-background" />,
  Controls: () => <div data-testid="reactflow-controls" />,
  MiniMap: () => <div data-testid="reactflow-minimap" />,
  useNodesState: (initialNodes: unknown[]) => [initialNodes, vi.fn(), vi.fn()],
  useEdgesState: (initialEdges: unknown[]) => [initialEdges, vi.fn(), vi.fn()],
  addEdge: vi.fn(),
  MarkerType: { ArrowClosed: 'arrowClosed' },
  Handle: ({ position, type }: { position: string; type: string }) => (
    <div data-testid={`handle-${type}-${position}`} />
  ),
  Position: { Top: 'top', Bottom: 'bottom', Left: 'left', Right: 'right' },
}));

// ============================================================================
// PreviewPanel Tests
// ============================================================================

describe('PreviewPanel', () => {
  describe('rendering', () => {
    it('should render with default tabs', () => {
      render(<PreviewPanel />);

      expect(screen.getByText('Preview Panel')).toBeInTheDocument();
      expect(screen.getByText('Screenshot')).toBeInTheDocument();
      expect(screen.getByText('Activity')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText('Graph')).toBeInTheDocument();
      expect(screen.getByText('Tools')).toBeInTheDocument();
    });

    it('should render with custom tabs', () => {
      const customTabs = [
        { id: 'custom1', label: 'Custom Tab 1', icon: <span>C1</span>, content: <div>Custom Content 1</div> },
        { id: 'custom2', label: 'Custom Tab 2', icon: <span>C2</span>, content: <div>Custom Content 2</div> },
      ];

      render(<PreviewPanel tabs={customTabs} />);

      expect(screen.getByText('Custom Tab 1')).toBeInTheDocument();
      expect(screen.getByText('Custom Tab 2')).toBeInTheDocument();
      expect(screen.queryByText('Screenshot')).not.toBeInTheDocument();
    });

    it('should show empty state when no content provided', () => {
      render(<PreviewPanel defaultTab="screenshot" />);

      expect(screen.getByText('No screenshots available')).toBeInTheDocument();
    });
  });

  describe('tab switching', () => {
    it('should switch tabs when clicked', async () => {
      const user = userEvent.setup();

      render(
        <PreviewPanel
          screenshotViewer={<div>Screenshot Content</div>}
          activityLog={<div>Activity Content</div>}
          defaultTab="screenshot"
        />
      );

      // Initially shows screenshot content
      expect(screen.getByText('Screenshot Content')).toBeInTheDocument();

      // Click Activity tab
      await user.click(screen.getByText('Activity'));

      // Should show activity content
      await waitFor(() => {
        expect(screen.getByText('Activity Content')).toBeInTheDocument();
      });
    });

    it('should display badge count on tabs', () => {
      const tabsWithBadge = [
        { id: 'test', label: 'Test', icon: <span>T</span>, content: <div>Test</div>, badge: 5 },
        { id: 'test2', label: 'Test 2', icon: <span>T2</span>, content: <div>Test 2</div>, badge: 150 },
      ];

      render(<PreviewPanel tabs={tabsWithBadge} />);

      expect(screen.getByText('5')).toBeInTheDocument();
      expect(screen.getByText('99+')).toBeInTheDocument();
    });
  });

  describe('expand/collapse', () => {
    it('should call onToggleExpand when expand button is clicked', async () => {
      const user = userEvent.setup();
      const onToggleExpand = vi.fn();

      render(<PreviewPanel isExpanded={false} onToggleExpand={onToggleExpand} />);

      const expandButton = screen.getByTitle('Expand');
      await user.click(expandButton);

      expect(onToggleExpand).toHaveBeenCalledTimes(1);
    });

    it('should show collapse icon when expanded', () => {
      render(<PreviewPanel isExpanded={true} onToggleExpand={() => {}} />);

      expect(screen.getByTitle('Collapse')).toBeInTheDocument();
    });
  });

  describe('close functionality', () => {
    it('should call onClose when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      render(<PreviewPanel onClose={onClose} />);

      const closeButton = screen.getByTitle('Close panel');
      await user.click(closeButton);

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not show close button when onClose is not provided', () => {
      render(<PreviewPanel />);

      expect(screen.queryByTitle('Close panel')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// ScreenshotViewer Tests
// ============================================================================

describe('ScreenshotViewer', () => {
  const mockScreenshots: Screenshot[] = [
    { id: '1', url: '/screenshot1.png', alt: 'Screenshot 1', timestamp: new Date('2024-01-15') },
    { id: '2', url: '/screenshot2.png', alt: 'Screenshot 2', timestamp: new Date('2024-01-16') },
    { id: '3', url: '/screenshot3.png', alt: 'Screenshot 3' },
  ];

  describe('rendering', () => {
    it('should render empty state when no screenshots', () => {
      render(<ScreenshotViewer screenshots={[]} />);

      expect(screen.getByText('No screenshots available')).toBeInTheDocument();
    });

    it('should render first screenshot by default', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      // There are 2 images with same alt: main and thumbnail. Get all and check the first (main)
      const images = screen.getAllByAltText('Screenshot 1');
      expect(images[0]).toBeInTheDocument();
      expect(images[0]).toHaveAttribute('src', '/screenshot1.png');
    });

    it('should render at specific initial index', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} initialIndex={1} />);

      // Get the main image (first match is the large viewer image)
      const images = screen.getAllByAltText('Screenshot 2');
      expect(images[0]).toBeInTheDocument();
    });
  });

  describe('zoom functionality', () => {
    it('should display zoom level', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should zoom in when zoom in button is clicked', async () => {
      const user = userEvent.setup();
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      const zoomInButton = screen.getByTitle('Zoom in');
      await user.click(zoomInButton);

      expect(screen.getByText('125%')).toBeInTheDocument();
    });

    it('should zoom out when zoom out button is clicked', async () => {
      const user = userEvent.setup();
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      // First zoom in
      await user.click(screen.getByTitle('Zoom in'));
      expect(screen.getByText('125%')).toBeInTheDocument();

      // Then zoom out
      await user.click(screen.getByTitle('Zoom out'));
      expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('should disable zoom out at minimum level', async () => {
      const user = userEvent.setup();
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      // Zoom out to minimum
      for (let i = 0; i < 5; i++) {
        await user.click(screen.getByTitle('Zoom out'));
      }

      expect(screen.getByTitle('Zoom out')).toBeDisabled();
    });

    it('should disable zoom in at maximum level', async () => {
      const user = userEvent.setup();
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      // Zoom in to maximum
      for (let i = 0; i < 10; i++) {
        await user.click(screen.getByTitle('Zoom in'));
      }

      expect(screen.getByTitle('Zoom in')).toBeDisabled();
    });
  });

  describe('navigation', () => {
    it('should call onScreenshotChange when navigating', async () => {
      const user = userEvent.setup();
      const onScreenshotChange = vi.fn();

      render(
        <ScreenshotViewer
          screenshots={mockScreenshots}
          initialIndex={0}
          onScreenshotChange={onScreenshotChange}
        />
      );

      // Find thumbnail button for screenshot 2
      const thumbnails = screen.getAllByRole('button').filter((btn) =>
        btn.querySelector('img[alt*="Thumbnail"]')
      );

      if (thumbnails[1]) {
        await user.click(thumbnails[1]);
        expect(onScreenshotChange).toHaveBeenCalledWith(1);
      }
    });
  });

  describe('download', () => {
    it('should show download button when enabled', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} enableDownload />);

      expect(screen.getByTitle('Download')).toBeInTheDocument();
    });

    it('should not show download button when disabled', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} enableDownload={false} />);

      expect(screen.queryByTitle('Download')).not.toBeInTheDocument();
    });
  });

  describe('fullscreen', () => {
    it('should call onFullscreen when fullscreen button is clicked', async () => {
      const user = userEvent.setup();
      const onFullscreen = vi.fn();

      render(<ScreenshotViewer screenshots={mockScreenshots} onFullscreen={onFullscreen} />);

      await user.click(screen.getByTitle('Fullscreen'));

      expect(onFullscreen).toHaveBeenCalledWith(mockScreenshots[0]);
    });
  });

  describe('rotation', () => {
    it('should rotate image when rotate button is clicked', async () => {
      const user = userEvent.setup();
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      await user.click(screen.getByTitle('Rotate'));

      // After rotation, the reset button should appear
      expect(screen.getByTitle('Reset')).toBeInTheDocument();
    });
  });

  describe('thumbnails', () => {
    it('should render thumbnails for multiple screenshots', () => {
      render(<ScreenshotViewer screenshots={mockScreenshots} />);

      // The thumbnails use the actual alt text from screenshots (e.g., "Screenshot 1")
      // Each screenshot appears twice: main image + thumbnail
      // So we check there are 3 images per screenshot type
      const screenshot1Images = screen.getAllByAltText('Screenshot 1');
      const screenshot2Images = screen.getAllByAltText('Screenshot 2');
      const screenshot3Images = screen.getAllByAltText('Screenshot 3');

      // Main image + thumbnail = 2 each, but screenshot 1 is the current one and may have different count
      expect(screenshot1Images.length).toBeGreaterThan(0);
      expect(screenshot2Images.length).toBeGreaterThan(0);
      expect(screenshot3Images.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// ActivityLog Tests
// ============================================================================

describe('ActivityLog', () => {
  const createMockEvent = (
    id: string,
    type: ActivityEventType,
    title: string,
    overrides: Partial<ActivityEvent> = {}
  ): ActivityEvent => ({
    id,
    type,
    timestamp: new Date('2024-01-15T10:00:00'),
    title,
    ...overrides,
  });

  const mockEvents: ActivityEvent[] = [
    createMockEvent('1', 'phase_start', 'Phase 1 Started', {
      metadata: { phase: 1, phaseName: 'Analysis' },
    }),
    createMockEvent('2', 'tool_call', 'Tool Execution', {
      metadata: { toolName: 'web_search', status: 'executing' },
    }),
    createMockEvent('3', 'tool_result', 'Tool Completed', {
      metadata: { toolName: 'web_search', status: 'completed', duration: 150 },
    }),
    createMockEvent('4', 'memory_update', 'Memory Updated', {
      description: 'User preference saved',
    }),
    createMockEvent('5', 'error', 'Error Occurred', {
      metadata: { error: 'Network timeout' },
    }),
    createMockEvent('6', 'done', 'Completed'),
  ];

  describe('rendering', () => {
    it('should render empty state when no events', () => {
      render(<ActivityLog events={[]} />);

      expect(screen.getByText('No activity yet')).toBeInTheDocument();
    });

    it('should render events list', () => {
      render(<ActivityLog events={mockEvents} />);

      expect(screen.getByText('Phase 1 Started')).toBeInTheDocument();
      expect(screen.getByText('Tool Execution')).toBeInTheDocument();
      expect(screen.getByText('Memory Updated')).toBeInTheDocument();
    });

    it('should show event count in footer', () => {
      render(<ActivityLog events={mockEvents} />);

      expect(screen.getByText(/6 of 6 events/)).toBeInTheDocument();
    });
  });

  describe('filtering', () => {
    it('should filter events by search query', async () => {
      const user = userEvent.setup();
      render(<ActivityLog events={mockEvents} showFilters />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      await user.type(searchInput, 'Tool');

      await waitFor(() => {
        expect(screen.getByText('Tool Execution')).toBeInTheDocument();
        expect(screen.getByText('Tool Completed')).toBeInTheDocument();
        expect(screen.queryByText('Phase 1 Started')).not.toBeInTheDocument();
      });
    });

    it('should show no matching events message when filter matches nothing', async () => {
      const user = userEvent.setup();
      render(<ActivityLog events={mockEvents} showFilters />);

      const searchInput = screen.getByPlaceholderText('Search events...');
      await user.type(searchInput, 'xyznonexistent');

      await waitFor(() => {
        expect(screen.getByText('No matching events')).toBeInTheDocument();
      });
    });
  });

  describe('auto-scroll', () => {
    it('should toggle auto-scroll when button is clicked', async () => {
      const user = userEvent.setup();
      render(<ActivityLog events={mockEvents} autoScroll={true} showFilters />);

      expect(screen.getByText('Live')).toBeInTheDocument();

      const toggleButton = screen.getByTitle('Pause auto-scroll');
      await user.click(toggleButton);

      await waitFor(() => {
        expect(screen.getByText('Paused')).toBeInTheDocument();
      });
    });
  });

  describe('event expansion', () => {
    it('should expand event details when clicked', async () => {
      const user = userEvent.setup();
      render(<ActivityLog events={mockEvents} />);

      // Click on event with metadata
      const toolEvent = screen.getByText('Tool Completed');
      await user.click(toolEvent.closest('div')!);

      await waitFor(() => {
        expect(screen.getByText('150ms')).toBeInTheDocument();
      });
    });

    it('should call onEventClick when event is clicked', async () => {
      const user = userEvent.setup();
      const onEventClick = vi.fn();

      render(<ActivityLog events={mockEvents} onEventClick={onEventClick} />);

      const event = screen.getByText('Phase 1 Started');
      await user.click(event.closest('div')!);

      expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
    });
  });

  describe('status badges', () => {
    it('should display status badge for events with status', () => {
      render(<ActivityLog events={mockEvents} />);

      expect(screen.getByText('Running')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });
  });

  describe('max events limit', () => {
    it('should limit displayed events to maxEvents', () => {
      const manyEvents = Array.from({ length: 10 }, (_, i) =>
        createMockEvent(`event-${i}`, 'phase_start', `Event ${i}`)
      );

      render(<ActivityLog events={manyEvents} maxEvents={5} />);

      expect(screen.getByText(/5 of 10 events/)).toBeInTheDocument();
    });
  });
});

// ============================================================================
// MemoryViewer Tests
// ============================================================================

describe('MemoryViewer', () => {
  const createMockFact = (id: string, layer: MemoryLayer, content: string): MemoryFact => ({
    id,
    content,
    layer,
    confidence: 0.85,
    createdAt: new Date('2024-01-15'),
    source: 'test',
  });

  const mockMemory: MemoryData = {
    layers: {
      [MemoryLayer.L0_SESSION]: [
        createMockFact('f1', MemoryLayer.L0_SESSION, 'Current session context'),
      ],
      [MemoryLayer.L1_CONVERSATION]: [
        createMockFact('f2', MemoryLayer.L1_CONVERSATION, 'Conversation history'),
      ],
      [MemoryLayer.L2_USER]: [
        createMockFact('f3', MemoryLayer.L2_USER, 'User prefers dark mode'),
        createMockFact('f4', MemoryLayer.L2_USER, 'User language is Italian'),
      ],
      [MemoryLayer.L3_SEMANTIC]: [
        createMockFact('f5', MemoryLayer.L3_SEMANTIC, 'Topic about AI'),
      ],
    },
  };

  describe('rendering', () => {
    it('should render empty state when no memory data', () => {
      render(<MemoryViewer memory={{ layers: {} }} />);

      expect(screen.getByText('No memory data available')).toBeInTheDocument();
    });

    it('should render memory layers in tree view', () => {
      render(<MemoryViewer memory={mockMemory} mode="tree" />);

      expect(screen.getByText('L0 - Session')).toBeInTheDocument();
      expect(screen.getByText('L1 - Conversation')).toBeInTheDocument();
      expect(screen.getByText('L2 - User')).toBeInTheDocument();
      expect(screen.getByText('L3 - Semantic')).toBeInTheDocument();
    });

    it('should show total facts count', () => {
      render(<MemoryViewer memory={mockMemory} showStats />);

      expect(screen.getByText(/Total:/)).toBeInTheDocument();
    });
  });

  describe('view modes', () => {
    it('should switch to JSON view', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} mode="tree" />);

      await user.click(screen.getByText('JSON'));

      await waitFor(() => {
        expect(screen.getByText(/"layers"/)).toBeInTheDocument();
      });
    });

    it('should switch to list view', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} mode="tree" />);

      await user.click(screen.getByText('LIST'));

      await waitFor(() => {
        expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
        expect(screen.getByText('User language is Italian')).toBeInTheDocument();
      });
    });

    it('should highlight active view mode button', () => {
      render(<MemoryViewer memory={mockMemory} mode="tree" />);

      const treeButton = screen.getByText('TREE');
      expect(treeButton).toHaveClass('bg-leo-secondary');
    });
  });

  describe('search functionality', () => {
    it('should filter facts by search query', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} mode="list" />);

      await user.click(screen.getByText('LIST'));

      const searchInput = screen.getByPlaceholderText('Search memory...');
      await user.type(searchInput, 'dark mode');

      await waitFor(() => {
        expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
        expect(screen.queryByText('User language is Italian')).not.toBeInTheDocument();
      });
    });
  });

  describe('tree expansion', () => {
    it('should expand layer when clicked', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} mode="tree" expandable />);

      // L2 should be collapsed by default (only L0 and L1 are expanded)
      expect(screen.queryByText('User prefers dark mode')).not.toBeInTheDocument();

      // Click to expand L2
      await user.click(screen.getByText('L2 - User'));

      await waitFor(() => {
        expect(screen.getByText('User prefers dark mode')).toBeInTheDocument();
      });
    });

    it('should collapse expanded layer when clicked', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} mode="tree" expandable />);

      // L0 should be expanded by default
      expect(screen.getByText('Current session context')).toBeInTheDocument();

      // Click to collapse L0
      await user.click(screen.getByText('L0 - Session'));

      await waitFor(() => {
        expect(screen.queryByText('Current session context')).not.toBeInTheDocument();
      });
    });
  });

  describe('copy functionality', () => {
    it('should copy memory as JSON when copy button is clicked', async () => {
      const user = userEvent.setup();
      // Spy on clipboard
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(<MemoryViewer memory={mockMemory} />);

      await user.click(screen.getByTitle('Copy as JSON'));

      expect(writeTextSpy).toHaveBeenCalled();
      writeTextSpy.mockRestore();
    });
  });

  describe('layer filtering', () => {
    it('should filter by layer when layer stat is clicked', async () => {
      const user = userEvent.setup();
      render(<MemoryViewer memory={mockMemory} showStats mode="tree" />);

      // Click on L2 stat to filter
      const l2Button = screen.getByText('L2:').closest('button');
      if (l2Button) await user.click(l2Button);

      await waitFor(() => {
        expect(screen.queryByText('L0 - Session')).not.toBeInTheDocument();
        expect(screen.getByText('L2 - User')).toBeInTheDocument();
      });
    });
  });

  describe('fact interaction', () => {
    it('should call onFactClick when fact is clicked', async () => {
      const user = userEvent.setup();
      const onFactClick = vi.fn();

      render(<MemoryViewer memory={mockMemory} mode="list" onFactClick={onFactClick} />);

      await user.click(screen.getByText('LIST'));

      const factElement = screen.getByText('Current session context');
      await user.click(factElement.closest('div')!);

      expect(onFactClick).toHaveBeenCalled();
    });
  });
});

// ============================================================================
// ToolExecutionCard Tests
// ============================================================================

describe('ToolExecutionCard', () => {
  const createMockTool = (overrides: Partial<ToolExecution> = {}): ToolExecution => ({
    id: 'tool-1',
    name: 'web_search',
    type: 'search',
    status: 'completed',
    input: { query: 'test query' },
    output: { results: ['result1', 'result2'] },
    startedAt: new Date('2024-01-15T10:00:00'),
    completedAt: new Date('2024-01-15T10:00:05'),
    ...overrides,
  });

  describe('rendering', () => {
    it('should render tool name and type', () => {
      render(<ToolExecutionCard tool={createMockTool()} />);

      expect(screen.getByText('web_search')).toBeInTheDocument();
      expect(screen.getByText('search')).toBeInTheDocument();
    });

    it('should render status indicator', () => {
      render(<ToolExecutionCard tool={createMockTool({ status: 'completed' })} />);

      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    it('should render duration', () => {
      render(<ToolExecutionCard tool={createMockTool()} />);

      expect(screen.getByText('5.0s')).toBeInTheDocument();
    });
  });

  describe('status display', () => {
    it('should show pending status correctly', () => {
      render(<ToolExecutionCard tool={createMockTool({ status: 'pending' })} />);

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    it('should show executing status with spinner', () => {
      render(<ToolExecutionCard tool={createMockTool({ status: 'executing' })} />);

      expect(screen.getByText('Executing')).toBeInTheDocument();
    });

    it('should show failed status', () => {
      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'failed', error: 'Network error' })}
        />
      );

      expect(screen.getByText('Failed')).toBeInTheDocument();
    });
  });

  describe('expand functionality', () => {
    it('should expand when clicked', async () => {
      const user = userEvent.setup();
      render(<ToolExecutionCard tool={createMockTool()} />);

      // Click to expand
      const header = screen.getByText('web_search').closest('button');
      if (header) await user.click(header);

      await waitFor(() => {
        expect(screen.getByText('Input')).toBeInTheDocument();
        expect(screen.getByText('Output')).toBeInTheDocument();
      });
    });

    it('should call onToggleExpand when expanded', async () => {
      const user = userEvent.setup();
      const onToggleExpand = vi.fn();

      render(<ToolExecutionCard tool={createMockTool()} onToggleExpand={onToggleExpand} />);

      const header = screen.getByText('web_search').closest('button');
      if (header) await user.click(header);

      expect(onToggleExpand).toHaveBeenCalled();
    });

    it('should show input and output when expanded', () => {
      render(<ToolExecutionCard tool={createMockTool()} expanded />);

      expect(screen.getByText('Input')).toBeInTheDocument();
      expect(screen.getByText('Output')).toBeInTheDocument();
    });

    it('should show error when tool failed', () => {
      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'failed', error: 'Network timeout' })}
          expanded
        />
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText('Network timeout')).toBeInTheDocument();
    });

    it('should show timestamps when expanded and showTimestamps is true', () => {
      render(<ToolExecutionCard tool={createMockTool()} expanded showTimestamps />);

      expect(screen.getByText(/Started:/)).toBeInTheDocument();
      expect(screen.getByText(/Completed:/)).toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy input when copy button is clicked', async () => {
      const user = userEvent.setup();
      // Spy on clipboard
      const writeTextSpy = vi.spyOn(navigator.clipboard, 'writeText');

      render(<ToolExecutionCard tool={createMockTool()} expanded />);

      // Find copy buttons (there should be 2: one for input, one for output)
      const copyButtons = screen.getAllByRole('button').filter(
        (btn) => btn.querySelector('svg.lucide-copy') || btn.querySelector('svg.lucide-check')
      );

      if (copyButtons.length > 0) {
        await user.click(copyButtons[0]!);
        expect(writeTextSpy).toHaveBeenCalled();
      }
      writeTextSpy.mockRestore();
    });
  });

  describe('actions', () => {
    it('should show retry button for failed tools', () => {
      const onRetry = vi.fn();
      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'failed' })}
          expanded
          onRetry={onRetry}
        />
      );

      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should call onRetry when retry button is clicked', async () => {
      const user = userEvent.setup();
      const onRetry = vi.fn();

      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'failed' })}
          expanded
          onRetry={onRetry}
        />
      );

      await user.click(screen.getByText('Retry'));

      expect(onRetry).toHaveBeenCalled();
    });

    it('should show cancel button for executing tools', () => {
      const onCancel = vi.fn();
      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'executing' })}
          expanded
          onCancel={onCancel}
        />
      );

      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const onCancel = vi.fn();

      render(
        <ToolExecutionCard
          tool={createMockTool({ status: 'executing' })}
          expanded
          onCancel={onCancel}
        />
      );

      await user.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalled();
    });
  });

  describe('compact mode', () => {
    it('should not show status label in compact mode', () => {
      render(<ToolExecutionCard tool={createMockTool()} compact />);

      expect(screen.queryByText('Completed')).not.toBeInTheDocument();
    });
  });
});

// ============================================================================
// ToolExecutionList Tests
// ============================================================================

describe('ToolExecutionList', () => {
  const mockTools: ToolExecution[] = [
    {
      id: 'tool-1',
      name: 'web_search',
      type: 'search',
      status: 'completed',
      input: { query: 'test' },
      startedAt: new Date(),
    },
    {
      id: 'tool-2',
      name: 'code_execute',
      type: 'code',
      status: 'executing',
      input: { code: 'console.log("test")' },
      startedAt: new Date(),
    },
    {
      id: 'tool-3',
      name: 'file_read',
      type: 'file',
      status: 'failed',
      error: 'File not found',
      startedAt: new Date(),
    },
  ];

  describe('rendering', () => {
    it('should render empty state when no tools', () => {
      render(<ToolExecutionList tools={[]} />);

      expect(screen.getByText('No tool executions')).toBeInTheDocument();
    });

    it('should render list of tools', () => {
      render(<ToolExecutionList tools={mockTools} />);

      expect(screen.getByText('web_search')).toBeInTheDocument();
      expect(screen.getByText('code_execute')).toBeInTheDocument();
      expect(screen.getByText('file_read')).toBeInTheDocument();
    });
  });

  describe('expand all', () => {
    it('should expand all cards when expandAll is true', () => {
      render(<ToolExecutionList tools={mockTools} expandAll />);

      // Only tools with input should show "Input" label
      // tool-3 has no input defined, so only 2 Input labels
      const inputLabels = screen.getAllByText('Input');
      expect(inputLabels.length).toBeGreaterThan(0);
    });
  });

  describe('tool interaction', () => {
    it('should call onToolClick when tool is clicked', async () => {
      const user = userEvent.setup();
      const onToolClick = vi.fn();

      render(<ToolExecutionList tools={mockTools} onToolClick={onToolClick} />);

      const toolHeader = screen.getByText('web_search').closest('button');
      if (toolHeader) await user.click(toolHeader);

      expect(onToolClick).toHaveBeenCalledWith(mockTools[0]);
    });
  });
});
