/**
 * Staff portal authentication
 * POST { password: string } → { success: boolean }
 */
export const handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { password } = JSON.parse(event.body ?? '{}');
    const correct = password && password === process.env.STAFF_PASSWORD;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: Boolean(correct) }),
    };
  } catch {
    return { statusCode: 400, body: JSON.stringify({ success: false }) };
  }
};
