/**
 * Safe fetch utility to handle JSON parsing and non-JSON responses gracefully.
 * Prevents the "Unexpected token < in JSON" errors common when APIs return HTML 404s.
 */
export async function safeFetch(url, options = {}) {
  try {
    const response = await fetch(url, options);
    const contentType = response.headers.get("content-type");
    
    if (response.ok && contentType && contentType.includes("application/json")) {
      const text = await response.text();
      try {
        const data = JSON.parse(text);
        return { data, ok: true, status: response.status };
      } catch (err) {
        console.warn("[safeFetch] JSON parsing failed, likely received HTML with JSON header.");
        return { 
          data: null, 
          ok: false, 
          status: response.status, 
          error: "Invalid JSON response",
          isHtml: text.trim().startsWith('<!doctype') || text.trim().startsWith('<html') 
        };
      }
    }
    
    // If not JSON, return the raw text or a descriptive error
    const rawText = await response.text();
    return { 
      data: null, 
      ok: false, 
      status: response.status, 
      error: response.statusText,
      isHtml: rawText.trim().startsWith('<!doctype') || rawText.trim().startsWith('<html')
    };
  } catch (error) {
    return { data: null, ok: false, error: error.message };
  }
}
