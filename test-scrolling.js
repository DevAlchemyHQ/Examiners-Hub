// Test Scrolling Functionality
// This script tests if vertical scrolling is working properly

const testScrolling = () => {
  console.log('🔍 Testing Scrolling Functionality...');
  
  // Test 1: Check if scroll containers exist
  console.log('\n📋 1. Checking for scroll containers...');
  
  const imageGridContainer = document.querySelector('[ref="imageGridRef"]') || 
                            document.querySelector('.lg\\:col-span-6 .overflow-y-auto');
  
  const selectedPanelContainer = document.querySelector('[ref="selectedPanelRef"]') || 
                                document.querySelector('.lg\\:col-span-6 .overflow-y-auto');
  
  console.log('📦 Image Grid Container:', {
    found: !!imageGridContainer,
    element: imageGridContainer,
    scrollHeight: imageGridContainer?.scrollHeight,
    clientHeight: imageGridContainer?.clientHeight,
    hasScroll: imageGridContainer?.scrollHeight > imageGridContainer?.clientHeight
  });
  
  console.log('📦 Selected Panel Container:', {
    found: !!selectedPanelContainer,
    element: selectedPanelContainer,
    scrollHeight: selectedPanelContainer?.scrollHeight,
    clientHeight: selectedPanelContainer?.clientHeight,
    hasScroll: selectedPanelContainer?.scrollHeight > selectedPanelContainer?.clientHeight
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
      hasScrollbarClasses: container.className.includes('scrollbar-thin')
    });
  });
  
  // Test 3: Test scroll functionality
  console.log('\n📋 3. Testing scroll functionality...');
  
  if (imageGridContainer) {
    const originalScrollTop = imageGridContainer.scrollTop;
    imageGridContainer.scrollTop = 100;
    const newScrollTop = imageGridContainer.scrollTop;
    
    console.log('📦 Image Grid Scroll Test:', {
      originalScrollTop,
      newScrollTop,
      scrollable: newScrollTop !== originalScrollTop,
      scrollHeight: imageGridContainer.scrollHeight,
      clientHeight: imageGridContainer.clientHeight
    });
    
    // Reset scroll position
    imageGridContainer.scrollTop = originalScrollTop;
  }
  
  if (selectedPanelContainer) {
    const originalScrollTop = selectedPanelContainer.scrollTop;
    selectedPanelContainer.scrollTop = 100;
    const newScrollTop = selectedPanelContainer.scrollTop;
    
    console.log('📦 Selected Panel Scroll Test:', {
      originalScrollTop,
      newScrollTop,
      scrollable: newScrollTop !== originalScrollTop,
      scrollHeight: selectedPanelContainer.scrollHeight,
      clientHeight: selectedPanelContainer.clientHeight
    });
    
    // Reset scroll position
    selectedPanelContainer.scrollTop = originalScrollTop;
  }
  
  // Test 4: Check for content that should be scrollable
  console.log('\n📋 4. Checking content for scrollability...');
  
  const images = document.querySelectorAll('img');
  const defectTiles = document.querySelectorAll('[data-testid="defect-tile"]');
  const imageGridItems = document.querySelectorAll('.aspect-square');
  
  console.log('📦 Content Analysis:', {
    imagesCount: images.length,
    defectTilesCount: defectTiles.length,
    imageGridItemsCount: imageGridItems.length,
    shouldHaveScroll: images.length > 20 || defectTiles.length > 10
  });
  
  // Test 5: Recommendations
  console.log('\n📋 5. Recommendations:');
  
  if (!imageGridContainer && !selectedPanelContainer) {
    console.log('❌ No scroll containers found - scrolling may not be working');
  } else {
    console.log('✅ Scroll containers found');
    
    if (imageGridContainer?.scrollHeight > imageGridContainer?.clientHeight) {
      console.log('✅ Image grid has scrollable content');
    } else {
      console.log('⚠️ Image grid may not have enough content to scroll');
    }
    
    if (selectedPanelContainer?.scrollHeight > selectedPanelContainer?.clientHeight) {
      console.log('✅ Selected panel has scrollable content');
    } else {
      console.log('⚠️ Selected panel may not have enough content to scroll');
    }
  }
  
  // Test 6: Manual scroll test
  console.log('\n📋 6. Manual scroll test instructions:');
  console.log('1. Try scrolling with mouse wheel in image grid');
  console.log('2. Try scrolling with mouse wheel in selected images panel');
  console.log('3. Try scrolling with mouse wheel in bulk defects panel');
  console.log('4. Check if scrollbars are visible and styled');
  console.log('5. Test on both desktop and mobile devices');
  
  return {
    imageGridContainer: !!imageGridContainer,
    selectedPanelContainer: !!selectedPanelContainer,
    hasScrollableContent: (imageGridContainer?.scrollHeight > imageGridContainer?.clientHeight) || 
                         (selectedPanelContainer?.scrollHeight > selectedPanelContainer?.clientHeight)
  };
};

// Run the test
const results = testScrolling();
console.log('\n📋 Test Results:', results);
