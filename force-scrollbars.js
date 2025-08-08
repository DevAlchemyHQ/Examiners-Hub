// Force Scrollbars to Appear
// This script forces scrollbars to be visible and tests scrolling functionality

const forceScrollbars = () => {
  console.log('🔧 Forcing scrollbars to appear...');
  
  // Find all scroll containers
  const scrollContainers = document.querySelectorAll('.overflow-y-auto');
  console.log('📦 Found scroll containers:', scrollContainers.length);
  
  // Force scrollbars to appear by adding content or adjusting styles
  scrollContainers.forEach((container, index) => {
    console.log(`📦 Container ${index + 1}:`, {
      element: container,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      hasOverflow: container.scrollHeight > container.clientHeight
    });
    
    // Add visible scrollbar styles
    container.style.setProperty('scrollbar-width', 'auto', 'important');
    container.style.setProperty('scrollbar-color', '#94a3b8 #e2e8f0', 'important');
    
    // Force scrollbar visibility
    if (container.scrollHeight <= container.clientHeight) {
      // Add padding to force overflow
      container.style.paddingBottom = '200px';
      console.log(`📦 Added padding to container ${index + 1} to force scrollbar`);
    }
  });
  
  // Test scrolling functionality
  console.log('\n🧪 Testing scroll functionality...');
  
  scrollContainers.forEach((container, index) => {
    if (container.scrollHeight > container.clientHeight) {
      console.log(`✅ Container ${index + 1} has scrollable content`);
      
      // Test scroll
      const originalScrollTop = container.scrollTop;
      container.scrollTop = 100;
      const newScrollTop = container.scrollTop;
      
      console.log(`📦 Container ${index + 1} scroll test:`, {
        originalScrollTop,
        newScrollTop,
        scrollable: newScrollTop !== originalScrollTop
      });
      
      // Reset scroll position
      container.scrollTop = originalScrollTop;
    } else {
      console.log(`⚠️ Container ${index + 1} has no scrollable content`);
    }
  });
  
  // Add CSS to make scrollbars more visible
  const style = document.createElement('style');
  style.textContent = `
    .overflow-y-auto {
      scrollbar-width: auto !important;
      scrollbar-color: #94a3b8 #e2e8f0 !important;
    }
    
    .overflow-y-auto::-webkit-scrollbar {
      width: 12px !important;
    }
    
    .overflow-y-auto::-webkit-scrollbar-track {
      background: #e2e8f0 !important;
      border-radius: 6px !important;
    }
    
    .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #94a3b8 !important;
      border-radius: 6px !important;
    }
    
    .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #64748b !important;
    }
    
    /* Dark mode */
    .dark .overflow-y-auto {
      scrollbar-color: #64748b #374151 !important;
    }
    
    .dark .overflow-y-auto::-webkit-scrollbar-track {
      background: #374151 !important;
    }
    
    .dark .overflow-y-auto::-webkit-scrollbar-thumb {
      background: #64748b !important;
    }
    
    .dark .overflow-y-auto::-webkit-scrollbar-thumb:hover {
      background: #475569 !important;
    }
  `;
  document.head.appendChild(style);
  
  console.log('✅ Added CSS to make scrollbars more visible');
  console.log('✅ Scrollbars should now be visible and functional');
  
  return {
    containersFound: scrollContainers.length,
    containersWithOverflow: Array.from(scrollContainers).filter(c => c.scrollHeight > c.clientHeight).length
  };
};

// Run the script
const results = forceScrollbars();
console.log('\n📋 Results:', results);
