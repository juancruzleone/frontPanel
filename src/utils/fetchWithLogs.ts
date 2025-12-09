// Wrapper de fetch con logging detallado para debugging
export const fetchWithLogs = async (url: string, options: RequestInit = {}) => {
  console.log('🌐 [FETCH] ========================================');
  console.log('🌐 [FETCH] URL:', url);
  console.log('🌐 [FETCH] Method:', options.method || 'GET');
  console.log('🌐 [FETCH] Headers enviados:', JSON.stringify(options.headers, null, 2));
  
  try {
    const response = await fetch(url, options);
    
    console.log('📥 [FETCH] Response status:', response.status);
    console.log('📥 [FETCH] Response ok:', response.ok);
    console.log('📥 [FETCH] Response headers:', {
      'content-type': response.headers.get('content-type'),
      'access-control-allow-origin': response.headers.get('access-control-allow-origin'),
    });
    
    return response;
  } catch (error) {
    console.error('❌ [FETCH] Error:', error);
    throw error;
  }
};
