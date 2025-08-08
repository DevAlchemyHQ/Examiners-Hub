// Test Scrolling Functionality
// This script tests if vertical scrolling is working properly

const testScrolling = () => {
  console.log('🔍 Testing Scrolling Functionality...');
  
  // Test 1: Check if scroll containers exist
  console.log('\n📋 1. Checking for scroll containers...');
  
  const imageGridContainer = document.querySelector('.lg\\:col-span-6 .overflow-y-auto');
  const selectedPanelContainer = document.querySelector('.lg\\:col-span-6 .overflow-y-auto');
  const bulkContainer = document.querySelector('.flex-1.overflow-y-auto');
  
  console.log('📦 Image Grid Container:', {
    found: !!imageGridContainer,
    element: imageGridContainer,
    scrollHeight: imageGridContainer?.scrollHeight,
    clientHeight: imageGridContainer?.clientHeight,
    hasScroll: imageGridContainer?.scrollHeight > imageGridContainer?.clientHeight,
    overflowY: imageGridContainer ? window.getComputedStyle(imageGridContainer).overflowY : null
  });
  
  console.log('📦 Selected Panel Container:', {
    found: !!selectedPanelContainer,
    element: selectedPanelContainer,
    scrollHeight: selectedPanelContainer?.scrollHeight,
    clientHeight: selectedPanelContainer?.clientHeight,
    hasScroll: selectedPanelContainer?.scrollHeight > selectedPanelContainer?.clientHeight,
    overflowY: selectedPanelContainer ? window.getComputedStyle(selectedPanelContainer).overflowY : null
  });
  
  console.log('📦 Bulk Container:', {
    found: !!bulkContainer,
    element: bulkContainer,
    scrollHeight: bulkContainer?.scrollHeight,
    clientHeight: bulkContainer?.clientHeight,
    hasScroll: bulkContainer?.scrollHeight > bulkContainer?.clientHeight,
    overflowY: bulkContainer ? window.getComputedStyle(bulkContainer).overflowY : null
  });
  
  // Test 2: Check scrollbar styles
  console.log('\n📋 2. Checking scrollbar styles...');
  
  const scrollContainers = document.querySelectorAll('.overflow-y-auto');
  console.log('📦 Found scroll containers:', scrollContainers.length);
  
  scrollContainers.forEach((container, index) => {
    const styles = window.getComputedStyle(container);
    console.log(`📦 Container ${index + 1}:`, {
      element: container,
      overflowY: styles.overflowY,
      scrollbarWidth: styles.scrollbarWidth,
      hasScrollbarClasses: container.className.includes('scrollbar-thin'),
      height: styles.height,
      maxHeight: styles.maxHeight
    });
  });
  
  // Test 3: Check height constraints
  console.log('\n📋 3. Checking height constraints...');
  
  const heightContainers = document.querySelectorAll('[class*="h-"]');
  console.log('📦 Height containers found:', heightContainers.length);
  
  heightContainers.forEach((container, index) => {
    const styles = window.getComputedStyle(container);
    console.log(`📦 Height container ${index + 1}:`, {
      element: container,
      height: styles.height,
      maxHeight: styles.maxHeight,
      minHeight: styles.minHeight,
      overflow: styles.overflow
    });
  });
  
  // Test 4: Check if content is overflowing
  console.log('\n📋 4. Checking content overflow...');
  
  const gridItems = document.querySelectorAll('.grid > div');
  console.log('📦 Grid items found:', gridItems.length);
  
  if (gridItems.length > 0) {
    const firstGrid = gridItems[0].closest('.grid');
    if (firstGrid) {
      const gridStyles = window.getComputedStyle(firstGrid);
      console.log('📦 Grid container:', {
        element: firstGrid,
        height: gridStyles.height,
        minHeight: gridStyles.minHeight,
        gridTemplateRows: gridStyles.gridTemplateRows,
        gridAutoRows: gridStyles.gridAutoRows
      });
    }
  }
  
  // Test 5: Force scroll test
  console.log('\n📋 5. Testing scroll behavior...');
  
  if (imageGridContainer && imageGridContainer.scrollHeight > imageGridContainer.clientHeight) {
    console.log('✅ Image grid has scrollable content');
    // Test scrolling
    const originalScrollTop = imageGridContainer.scrollTop;
    imageGridContainer.scrollTop = 100;
    setTimeout(() => {
      console.log('📦 Scroll test result:', {
        originalScrollTop,
        newScrollTop: imageGridContainer.scrollTop,
        scrollChanged: imageGridContainer.scrollTop !== originalScrollTop
      });
      imageGridContainer.scrollTop = originalScrollTop;
    }, 100);
  } else {
    console.log('❌ Image grid has no scrollable content');
  }
  
  console.log('\n🎯 Scroll Test Complete!');
};

// Run the test when the page loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', testScrolling);
} else {
  testScrolling();
}

// Also run after a delay to catch dynamic content
setTimeout(testScrolling, 2000);
