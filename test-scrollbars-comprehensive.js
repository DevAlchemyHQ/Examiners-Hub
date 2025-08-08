const puppeteer = require('puppeteer');

async function testScrollbars() {
  console.log('🧪 Starting comprehensive scrollbar test...');
  
  const browser = await puppeteer.launch({ 
    headless: false, 
    defaultViewport: { width: 1200, height: 800 },
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Navigate to the app
    console.log('📱 Loading app...');
    await page.goto('http://localhost:5173', { waitUntil: 'networkidle2' });
    
    // Wait for app to load
    await page.waitForSelector('[data-testid="main-app"]', { timeout: 10000 });
    console.log('✅ App loaded successfully');
    
    // Test 1: Check if scrollbars are present in Image Grid
    console.log('\n🔍 Testing Image Grid scrollbars...');
    const imageGridScrollable = await page.evaluate(() => {
      const imageGrid = document.querySelector('[data-testid="image-grid"]');
      if (!imageGrid) return { hasScrollbar: false, reason: 'Image grid not found' };
      
      const computedStyle = window.getComputedStyle(imageGrid);
      const hasOverflowY = computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll';
      const scrollHeight = imageGrid.scrollHeight;
      const clientHeight = imageGrid.clientHeight;
      const hasScrollableContent = scrollHeight > clientHeight;
      
      return {
        hasScrollbar: hasOverflowY,
        hasScrollableContent,
        scrollHeight,
        clientHeight,
        overflowY: computedStyle.overflowY
      };
    });
    
    console.log('📊 Image Grid Results:', imageGridScrollable);
    
    // Test 2: Check if scrollbars are present in Selected Images Panel
    console.log('\n🔍 Testing Selected Images Panel scrollbars...');
    const selectedPanelScrollable = await page.evaluate(() => {
      const selectedPanel = document.querySelector('[data-testid="selected-panel"]');
      if (!selectedPanel) return { hasScrollbar: false, reason: 'Selected panel not found' };
      
      const computedStyle = window.getComputedStyle(selectedPanel);
      const hasOverflowY = computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll';
      const scrollHeight = selectedPanel.scrollHeight;
      const clientHeight = selectedPanel.clientHeight;
      const hasScrollableContent = scrollHeight > clientHeight;
      
      return {
        hasScrollbar: hasOverflowY,
        hasScrollableContent,
        scrollHeight,
        clientHeight,
        overflowY: computedStyle.overflowY
      };
    });
    
    console.log('📊 Selected Panel Results:', selectedPanelScrollable);
    
    // Test 3: Check if scrollbars are present in Bulk Defects
    console.log('\n🔍 Testing Bulk Defects scrollbars...');
    const bulkDefectsScrollable = await page.evaluate(() => {
      const bulkDefects = document.querySelector('[data-testid="bulk-defects"]');
      if (!bulkDefects) return { hasScrollbar: false, reason: 'Bulk defects not found' };
      
      const computedStyle = window.getComputedStyle(bulkDefects);
      const hasOverflowY = computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll';
      const scrollHeight = bulkDefects.scrollHeight;
      const clientHeight = bulkDefects.clientHeight;
      const hasScrollableContent = scrollHeight > clientHeight;
      
      return {
        hasScrollbar: hasOverflowY,
        hasScrollableContent,
        scrollHeight,
        clientHeight,
        overflowY: computedStyle.overflowY
      };
    });
    
    console.log('📊 Bulk Defects Results:', bulkDefectsScrollable);
    
    // Test 4: Check all scrollable containers
    console.log('\n🔍 Testing ALL scrollable containers...');
    const allScrollableContainers = await page.evaluate(() => {
      const containers = document.querySelectorAll('.overflow-y-auto');
      const results = [];
      
      containers.forEach((container, index) => {
        const computedStyle = window.getComputedStyle(container);
        const hasOverflowY = computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll';
        const scrollHeight = container.scrollHeight;
        const clientHeight = container.clientHeight;
        const hasScrollableContent = scrollHeight > clientHeight;
        
        results.push({
          index,
          className: container.className,
          hasScrollbar: hasOverflowY,
          hasScrollableContent,
          scrollHeight,
          clientHeight,
          overflowY: computedStyle.overflowY,
          tagName: container.tagName,
          id: container.id || 'no-id'
        });
      });
      
      return results;
    });
    
    console.log('📊 All Scrollable Containers:', allScrollableContainers);
    
    // Test 5: Check if there's enough content to trigger scrollbars
    console.log('\n🔍 Checking content levels...');
    const contentLevels = await page.evaluate(() => {
      const imageGrid = document.querySelector('[data-testid="image-grid"]');
      const selectedPanel = document.querySelector('[data-testid="selected-panel"]');
      const bulkDefects = document.querySelector('[data-testid="bulk-defects"]');
      
      return {
        imageGrid: {
          images: imageGrid?.querySelectorAll('img')?.length || 0,
          totalHeight: imageGrid?.scrollHeight || 0,
          visibleHeight: imageGrid?.clientHeight || 0
        },
        selectedPanel: {
          selectedImages: selectedPanel?.querySelectorAll('[data-testid="selected-image"]')?.length || 0,
          totalHeight: selectedPanel?.scrollHeight || 0,
          visibleHeight: selectedPanel?.clientHeight || 0
        },
        bulkDefects: {
          defects: bulkDefects?.querySelectorAll('[data-testid="bulk-defect"]')?.length || 0,
          totalHeight: bulkDefects?.scrollHeight || 0,
          visibleHeight: bulkDefects?.clientHeight || 0
        }
      };
    });
    
    console.log('📊 Content Levels:', contentLevels);
    
    // Summary
    console.log('\n📋 SCROLLBAR TEST SUMMARY:');
    console.log('='.repeat(50));
    
    const summary = {
      imageGrid: {
        hasScrollbar: imageGridScrollable.hasScrollbar,
        hasContent: imageGridScrollable.hasScrollableContent,
        images: contentLevels.imageGrid.images
      },
      selectedPanel: {
        hasScrollbar: selectedPanelScrollable.hasScrollbar,
        hasContent: selectedPanelScrollable.hasScrollableContent,
        selectedImages: contentLevels.selectedPanel.selectedImages
      },
      bulkDefects: {
        hasScrollbar: bulkDefectsScrollable.hasScrollbar,
        hasContent: bulkDefectsScrollable.hasScrollableContent,
        defects: contentLevels.bulkDefects.defects
      },
      totalContainers: allScrollableContainers.length
    };
    
    console.log('📊 Summary:', JSON.stringify(summary, null, 2));
    
    // Final verdict
    const allHaveScrollbars = summary.imageGrid.hasScrollbar && 
                             summary.selectedPanel.hasScrollbar && 
                             summary.bulkDefects.hasScrollbar;
    
    console.log('\n🎯 FINAL VERDICT:');
    console.log(allHaveScrollbars ? '✅ ALL SECTIONS HAVE SCROLLBARS!' : '❌ SOME SECTIONS MISSING SCROLLBARS');
    console.log(`📊 Total scrollable containers found: ${summary.totalContainers}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testScrollbars();
