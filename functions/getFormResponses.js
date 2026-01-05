const functions = require('firebase-functions');
const axios = require('axios');

exports.getFormResponses = functions.https.onCall(async (data, context) => {
  // Check if user is authenticated
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Must be authenticated to call this function.'
    );
  }

  const { formId, accessToken } = data;

  if (!formId || !accessToken) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'formId and accessToken are required.'
    );
  }

  try {
    const response = await axios.get(
      `https://www.googleapis.com/forms/v1/forms/${formId}/responses`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    return {
      success: true,
      data: response.data,
    };
  } catch (error) {
    console.error('Error fetching form responses:', error.message);
    throw new functions.https.HttpsError(
      'internal',
      'Failed to fetch form responses: ' + error.message
    );
  }
});
