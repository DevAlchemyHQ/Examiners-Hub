// 🧪 SCROLLBAR TEST - Run this in browser console on localhost:5173

console.log('🧪 Starting scrollbar test...');

// Test 1: Check all overflow-y-auto containers
console.log('\n🔍 Testing ALL overflow-y-auto containers...');
const allScrollableContainers = Array.from(document.querySelectorAll('.overflow-y-auto')).map((container, index) => {
  const computedStyle = window.getComputedStyle(container);
  const hasOverflowY = computedStyle.overflowY === 'auto' || computedStyle.overflowY === 'scroll';
  const scrollHeight = container.scrollHeight;
  const clientHeight = container.clientHeight;
  const hasScrollableContent = scrollHeight > clientHeight;
  
  return {
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
  };
});

console.log('📊 All Scrollable Containers:', allScrollableContainers);

// Test 2: Check content levels
console.log('\n🔍 Checking content levels...');
const contentLevels = {
  totalImages: document.querySelectorAll('img').length,
  totalDivs: document.querySelectorAll('div').length,
  totalOverflowContainers: document.querySelectorAll('.overflow-y-auto').length,
  containerDetails: Array.from(document.querySelectorAll('.overflow-y-auto')).map((container, index) => ({
    index,
    className: container.className,
    scrollHeight: container.scrollHeight,
    clientHeight: container.clientHeight,
    hasOverflow: container.scrollHeight > container.clientHeight,
    childElements: container.children.length
  }))
};

console.log('📊 Content Levels:', contentLevels);

// Test 3: Check all elements with overflow
console.log('\n🔍 Checking ALL elements with overflow...');
const allElements = document.querySelectorAll('*');
const overflowElements = Array.from(allElements).filter(el => {
  const style = window.getComputedStyle(el);
  return style.overflowY === 'auto' || style.overflowY === 'scroll';
});

console.log('📊 Elements with overflow-y:', overflowElements.length);
overflowElements.forEach((el, index) => {
  console.log(`${index + 1}. ${el.tagName}.${el.className} - overflow-y: ${window.getComputedStyle(el).overflowY}`);
});

// Summary
console.log('\n📋 SCROLLBAR TEST SUMMARY:');
console.log('='.repeat(50));

const summary = {
  totalContainers: allScrollableContainers.length,
  containersWithScrollbars: allScrollableContainers.filter(c => c.hasScrollbar).length,
  containersWithContent: allScrollableContainers.filter(c => c.hasScrollableContent).length,
  totalImages: contentLevels.totalImages,
  totalOverflowElements: overflowElements.length
};

console.log('📊 Summary:', summary);

// Final verdict
const hasScrollbars = summary.containersWithScrollbars > 0;

console.log('\n🎯 FINAL VERDICT:');
console.log(hasScrollbars ? '✅ SCROLLBARS ARE PRESENT!' : '❌ NO SCROLLBARS FOUND');
console.log(`📊 Total scrollable containers found: ${summary.totalContainers}`);
console.log(`📊 Containers with scrollbars: ${summary.containersWithScrollbars}`);
console.log(`📊 Total images found: ${summary.totalImages}`);
console.log(`📊 Total overflow elements: ${summary.totalOverflowElements}`);

// Test 4: Visual test - highlight scrollable containers
console.log('\n🎨 Highlighting scrollable containers...');
allScrollableContainers.forEach((container, index) => {
  const element = document.querySelectorAll('.overflow-y-auto')[index];
  if (element) {
    element.style.border = '2px solid red';
    element.style.backgroundColor = 'rgba(255, 0, 0, 0.1)';
    console.log(`🔴 Highlighted container ${index + 1}: ${container.tagName}.${container.className}`);
  }
});

console.log('\n✅ Test complete! Check the highlighted red borders to see scrollable containers.');
