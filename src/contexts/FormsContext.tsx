import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';

interface FormItem {
  itemId: string;
  title: string;
  questionId?: string;
  required: boolean;
  type: string;
  options?: string[];
}

interface RowBasedResponse {
  [questionTitle: string]: string;
}

interface QuestionBasedResponse {
  [questionTitle: string]: string[];
}

interface FormData {
  formId: string;
  formName: string;
  rawForm: any;
  items: Record<string, FormItem>;
  itemsArray: FormItem[];
  rawResponses: any;
  responsesArray: RowBasedResponse[];
  questionsBasedResponses: QuestionBasedResponse;
}

interface FormsContextType {
  formsMap: Record<string, FormData>;
  loading: boolean;
  selectedForm: string;
  setSelectedForm: (formName: string) => void;
  selectedFormData: FormData | null;
  selectedFormResponsesArray: RowBasedResponse[];
  selectedFormQuestionsBasedResponses: QuestionBasedResponse;
  refreshForms: (forceRefresh?: boolean) => Promise<void>;
}

const FormsContext = createContext<FormsContextType | undefined>(undefined);

export function FormsProvider({ children }: { children: ReactNode }) {
  const { googleAccessToken } = useAuth();
  const [formsMap, setFormsMap] = useState<Record<string, FormData>>({});
  const [loading, setLoading] = useState(false);
  const [selectedForm, setSelectedForm] = useState('Contact Information');

  // Helper: parse form details into a map
  const parseFormDetails = (formData: any) => {
    const map: Record<string, FormItem> = {};
    const items = formData.items || [];

    items.forEach((item: any) => {
      const itemId = item.itemId;
      const title = item.title || item.description || '';

      if (item.questionItem && item.questionItem.question) {
        const q = item.questionItem.question;
        const questionId = q.questionId;
        const required = !!q.required;
        let type = 'unknown';
        let options: string[] | undefined;

        if (q.textQuestion !== undefined) {
          type = 'text';
        } else if (q.choiceQuestion !== undefined) {
          type = q.choiceQuestion.type?.toLowerCase() || 'choice';
          options = (q.choiceQuestion.options || []).map((o: any) => o.value);
        } else if (q.choiceAnswers !== undefined) {
          type = 'choice';
        }

        map[questionId] = { itemId, title, questionId, required, type, options };
      } else if (item.pageBreakItem) {
        map[itemId] = { itemId, title, questionId: undefined, required: false, type: 'pageBreak' };
      } else {
        map[itemId] = { itemId, title, questionId: item.itemId, required: false, type: 'unknown' };
      }
    });

    return map;
  };

  // Helper: parse responses into row-based format (one row per response)
  const parseResponses = (responsesData: any) => {
    const responses = responsesData.responses || [];

    return responses.map((response: any) => {
      const row: Record<string, string> = {};
      const answersObj = response.answers || response;

      if (typeof answersObj === 'object' && !Array.isArray(answersObj)) {
        Object.keys(answersObj).forEach((qid) => {
          const answer = answersObj[qid];
          let value = '';

          if (answer.textAnswers && Array.isArray(answer.textAnswers.answers)) {
            const textValues = answer.textAnswers.answers
              .filter((a: any) => a.value !== undefined)
              .map((a: any) => String(a.value));
            value = textValues.join(', ');
          } else if (answer.choiceAnswers && Array.isArray(answer.choiceAnswers.answers)) {
            const choiceValues = answer.choiceAnswers.answers
              .filter((a: any) => a.value !== undefined)
              .map((a: any) => String(a.value));
            value = choiceValues.join(', ');
          } else if (answer.value !== undefined) {
            value = String(answer.value);
          }

          row[qid] = value;
        });
      }
      return row;
    });
  };

  // Helper: parse responses into question-based format (one row per question with array of responses)
  const parseQuestionsBasedResponses = (
    responsesData: any,
    itemsArray: FormItem[],
    responsesArray: RowBasedResponse[]
  ): QuestionBasedResponse => {
    const questionMap: QuestionBasedResponse = {};

    // Initialize each question with empty array
    itemsArray.forEach((item) => {
      questionMap[item.title] = [];
    });

    // Collect all answers for each question
    responsesArray.forEach((responseRow) => {
      itemsArray.forEach((item) => {
        const answer = responseRow[item.questionId || ''] || '';
        if (answer && questionMap[item.title]) {
          questionMap[item.title].push(answer);
        }
      });
    });

    return questionMap;
  };

  const refreshForms = async (forceRefresh: boolean = false) => {
    // Check cache first - if data exists and not forcing refresh, skip API call
    if (!forceRefresh && Object.keys(formsMap).length > 0) {
      console.log('✅ Using cached forms data');
      return;
    }

    if (!googleAccessToken) {
      console.warn('⚠️  No Google access token available. Cannot fetch forms.');
      return;
    }

    setLoading(true);
    try {
      console.log('\n🔍 Fetching Google Forms from your Drive...\n');

      const searchResponse = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.form'&spaces=drive&fields=files(id,name,description)&pageSize=100`,
        {
          headers: {
            Authorization: `Bearer ${googleAccessToken}`,
          },
        }
      );

      if (!searchResponse.ok) {
        console.error(`❌ Google Drive API error (${searchResponse.status}):`, searchResponse.statusText);
        if (searchResponse.status === 401) {
          console.error('🔐 Unauthorized - Google access token may be expired or invalid');
        } else if (searchResponse.status === 403) {
          console.error('🔒 Forbidden - Check Google API permissions');
        }
        return;
      }

      const searchData = await searchResponse.json();
      const forms = searchData.files || [];

      console.log(`✅ Found ${forms.length} Google Forms\n`);

      if (forms.length === 0) {
        console.log('No Google Forms found in your Drive');
        return;
      }

      // Fetch all forms
      const newFormsMap: Record<string, FormData> = {};

      await Promise.all(
        forms.map(async (form: any) => {
          const formId = form.id;
          const formName = form.name;

          try {
            const [formResponse, responsesResponse] = await Promise.all([
              fetch(`https://forms.googleapis.com/v1/forms/${formId}`, {
                headers: { Authorization: `Bearer ${googleAccessToken}` },
              }),
              fetch(`https://forms.googleapis.com/v1/forms/${formId}/responses`, {
                headers: { Authorization: `Bearer ${googleAccessToken}` },
              }),
            ]);

            if (!formResponse.ok) {
              console.warn(`Failed to fetch form details for ${formId}:`, formResponse.status);
              return;
            }

            const formData = await formResponse.json();
            const formDetailsMap = parseFormDetails(formData);
            const itemsArray = Object.values(formDetailsMap).filter((item: any) => item.questionId);

            let responsesData: any = {};
            let responsesArray: RowBasedResponse[] = [];
            let questionsBasedResponses: QuestionBasedResponse = {};

            if (responsesResponse.ok) {
              responsesData = await responsesResponse.json();
              responsesArray = parseResponses(responsesData);
              questionsBasedResponses = parseQuestionsBasedResponses(responsesData, itemsArray, responsesArray);
            }

            newFormsMap[formId] = {
              formId,
              formName,
              rawForm: formData,
              items: formDetailsMap,
              itemsArray,
              rawResponses: responsesData,
              responsesArray,
              questionsBasedResponses,
            };

            console.log(`✅ Parsed form: ${formName} (${formId})`);
          } catch (err) {
            console.error(`Error processing form ${formId}:`, err);
          }
        })
      );

      setFormsMap(newFormsMap);
      console.log('✅ All forms cached in FormsContext');
    } catch (error) {
      console.error('Error fetching Google Forms:', error);
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh forms when token becomes available (handles delayed token assignment)
  useEffect(() => {
    if (googleAccessToken && Object.keys(formsMap).length === 0) {
      console.log('🔄 Google Access Token available - fetching forms...');
      refreshForms(true); // Force refresh only if cache is empty
    }
  }, [googleAccessToken]);

  // Get selected form data
  const selectedFormData =
    selectedForm &&
    formsMap[Object.keys(formsMap).find((key) => formsMap[key]?.formName === selectedForm) || ''] ||
    null;

  // Transform responses to row-based format
  const selectedFormResponsesArray =
    selectedFormData && selectedFormData.itemsArray && selectedFormData.responsesArray
      ? selectedFormData.responsesArray.map((responseRow: RowBasedResponse) => {
          const row: RowBasedResponse = {};
          selectedFormData.itemsArray.forEach((item: FormItem) => {
            row[item.title] = responseRow[item.questionId || ''] || '';
          });
          return row;
        })
      : [];

  // Get question-based responses (one question, array of answers)
  const selectedFormQuestionsBasedResponses = selectedFormData?.questionsBasedResponses || {};

  const value: FormsContextType = {
    formsMap,
    loading,
    selectedForm,
    setSelectedForm,
    selectedFormData,
    selectedFormResponsesArray,
    selectedFormQuestionsBasedResponses,
    refreshForms,
  };

  return <FormsContext.Provider value={value}>{children}</FormsContext.Provider>;
}

export function useForms() {
  const context = useContext(FormsContext);
  if (!context) {
    throw new Error('useForms must be used within FormsProvider');
  }
  return context;
}
