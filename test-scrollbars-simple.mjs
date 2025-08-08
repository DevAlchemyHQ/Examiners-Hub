import puppeteer from 'puppeteer';

async function testScrollbars() {
  console.log('🧪 Starting simple scrollbar test...');
  
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
    await page.waitForSelector('body', { timeout: 10000 });
    console.log('✅ App loaded successfully');
    
    // Test 1: Check all overflow-y-auto containers
    console.log('\n🔍 Testing ALL overflow-y-auto containers...');
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
          id: container.id || 'no-id',
          textContent: container.textContent.substring(0, 50) + '...'
        });
      });
      
      return results;
    });
    
    console.log('📊 All Scrollable Containers:', JSON.stringify(allScrollableContainers, null, 2));
    
    // Test 2: Check if there are any images or content
    console.log('\n🔍 Checking content levels...');
    const contentLevels = await page.evaluate(() => {
      const images = document.querySelectorAll('img');
      const divs = document.querySelectorAll('div');
      const containers = document.querySelectorAll('.overflow-y-auto');
      
      return {
        totalImages: images.length,
        totalDivs: divs.length,
        totalOverflowContainers: containers.length,
        containerDetails: Array.from(containers).map((container, index) => ({
          index,
          className: container.className,
          scrollHeight: container.scrollHeight,
          clientHeight: container.clientHeight,
          hasOverflow: container.scrollHeight > container.clientHeight
        }))
      };
    });
    
    console.log('📊 Content Levels:', JSON.stringify(contentLevels, null, 2));
    
    // Summary
    console.log('\n📋 SCROLLBAR TEST SUMMARY:');
    console.log('='.repeat(50));
    
    const summary = {
      totalContainers: allScrollableContainers.length,
      containersWithScrollbars: allScrollableContainers.filter(c => c.hasScrollbar).length,
      containersWithContent: allScrollableContainers.filter(c => c.hasScrollableContent).length,
      totalImages: contentLevels.totalImages
    };
    
    console.log('📊 Summary:', JSON.stringify(summary, null, 2));
    
    // Final verdict
    const hasScrollbars = summary.containersWithScrollbars > 0;
    
    console.log('\n🎯 FINAL VERDICT:');
    console.log(hasScrollbars ? '✅ SCROLLBARS ARE PRESENT!' : '❌ NO SCROLLBARS FOUND');
    console.log(`📊 Total scrollable containers found: ${summary.totalContainers}`);
    console.log(`📊 Containers with scrollbars: ${summary.containersWithScrollbars}`);
    console.log(`📊 Total images found: ${summary.totalImages}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  } finally {
    await browser.close();
  }
}

testScrollbars();
