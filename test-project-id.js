function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function generateStableProjectId(userEmail, projectName = 'current') {
  const normalized = `${userEmail.toLowerCase().trim()}::${projectName.trim()}`;
  const hash = simpleHash(normalized);
  return `proj_${hash}`;
}

const userId = 'timndg@gmail.com';
const projectId = generateStableProjectId(userId, 'current');

console.log('User:', userId);
console.log('Generated projectId:', projectId);
console.log('Expected: proj_6c894ef');

