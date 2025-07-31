import axios from "axios";

const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// 채팅 세션 관리를 위한 인터페이스
export interface ChatSession {
  sessionId: string;
  messages: Array<{
    role: "user" | "model";
    content: string;
    timestamp: Date;
  }>;
  context?: UserContext;
}

export interface GeminiMessage {
  role: "user" | "model";
  parts: { text: string }[];
}

export interface GeminiRequest {
  contents: GeminiMessage[];
  generationConfig?: {
    temperature?: number;
    topK?: number;
    topP?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string;
      }>;
    };
  }>;
}

export interface UserContext {
  level?: "beginner" | "intermediate" | "advanced";
  techStack?: string[];
  interests?: string[];
}

// 채팅 세션 저장소 (실제 프로덕션에서는 Redis나 데이터베이스 사용 권장)
const chatSessions = new Map<string, ChatSession>();

// 기술 스택별 특화 프롬프트
const techStackPrompts = {
  react: `
    React 생태계 전문가로서 답변해주세요:
    - React 18+ 최신 기능 활용 (Concurrent Features, Suspense)
    - Next.js, TypeScript 연동 및 최적화
    - 상태 관리 솔루션 (Redux Toolkit, Zustand, Recoil, Jotai)
    - 성능 최적화 (React.memo, useMemo, useCallback, React.lazy)
    - 컴포넌트 설계 패턴과 재사용성 (Atomic Design, Tailwind CSS)
  `,
  nodejs: `
    Node.js 백엔드 전문가로서 답변해주세요:
    - Express.js, Fastify, Koa 프레임워크 활용
    - 데이터베이스 연동 (MongoDB, PostgreSQL, MySQL)
    - API 설계 및 보안 (JWT, OAuth, Rate Limiting)
    - 마이크로서비스 아키텍처 및 Docker 배포
    - 성능 모니터링 및 로깅
  `,
  python: `
    Python 전문가로서 답변해주세요:
    - 웹 개발 (Django, Flask, FastAPI)
    - 데이터 분석 및 시각화 (Pandas, NumPy, Matplotlib)
    - 머신러닝/딥러닝 (Scikit-learn, TensorFlow, PyTorch)
    - 자동화 및 스크립팅 (Selenium, BeautifulSoup)
    - 가상환경 및 패키지 관리
  `,
  typescript: `
    TypeScript 전문가로서 답변해주세요:
    - 타입 시스템과 제네릭 활용
    - 인터페이스와 타입 정의 패턴
    - 유틸리티 타입과 조건부 타입
    - 모듈 시스템과 네임스페이스
    - 타입 가드와 타입 단언
  `,
  javascript: `
    JavaScript 전문가로서 답변해주세요:
    - ES6+ 최신 문법과 기능
    - 비동기 프로그래밍 (Promise, async/await)
    - 함수형 프로그래밍 패턴
    - 모듈 시스템과 번들러
    - 브라우저 API와 Web APIs
  `,
};

// 사용자 수준별 프롬프트
const levelPrompts = {
  beginner: `
    초보자를 위한 친근한 설명:
    - 기본 개념부터 차근차근 설명
    - 일상생활의 비유를 사용하여 이해하기 쉽게 설명
    - 실수하기 쉬운 부분을 미리 경고
    - 다음 단계 학습 방향 제시
    - 복잡한 용어는 쉬운 말로 풀어서 설명
  `,
  intermediate: `
    중급자를 위한 심화 설명:
    - 심화된 개념과 원리 설명
    - 성능과 최적화 관점에서의 조언
    - 다양한 접근 방법과 트레이드오프 설명
    - 실제 프로젝트 적용 사례 제시
    - 베스트 프랙티스와 안티패턴
  `,
  advanced: `
    고급자를 위한 전문적 설명:
    - 아키텍처 설계와 시스템 설계
    - 성능 최적화와 스케일링 전략
    - 보안과 보안 취약점 분석
    - 최신 기술 트렌드와 도입 전략
    - 코드 리뷰와 리팩토링 가이드
  `,
};

// 새로운 채팅 세션 생성
export const createChatSession = (context?: UserContext): string => {
  const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const session: ChatSession = {
    sessionId,
    messages: [],
    context,
  };

  chatSessions.set(sessionId, session);

  // 세션 정리 (24시간 후 자동 삭제)
  setTimeout(
    () => {
      chatSessions.delete(sessionId);
    },
    24 * 60 * 60 * 1000,
  );

  return sessionId;
};

// 채팅 세션 가져오기
export const getChatSession = (sessionId: string): ChatSession | null => {
  return chatSessions.get(sessionId) || null;
};

// 채팅 세션 삭제
export const deleteChatSession = (sessionId: string): boolean => {
  return chatSessions.delete(sessionId);
};

// 시스템 프롬프트 생성
const createSystemPrompt = (context?: UserContext): string => {
  let systemPrompt = `당신은 전문적이고 친근한 기술 멘토입니다. 

다음 원칙을 따라 답변해주세요:

1. **명확하고 간결한 설명**: 복잡한 개념을 쉽게 이해할 수 있도록 설명
2. **실용적인 예시**: 코드 예시나 실제 사용 사례를 포함
3. **단계별 접근**: 복잡한 주제는 단계별로 나누어 설명
4. **최신 정보**: 최신 기술 트렌드와 베스트 프랙티스를 반영
5. **한국어 답변**: 한국어로 답변하되, 필요한 경우 영어 용어도 함께 표기
6. **친근한 톤**: 격식차리지 않고 친근하게 대화하듯 설명
7. **대화 연속성**: 이전 대화 내용을 참고하여 자연스럽게 대화를 이어가세요

`;

  // 사용자 수준에 따른 프롬프트 추가
  if (context?.level && levelPrompts[context.level]) {
    systemPrompt += levelPrompts[context.level] + "\n";
  }

  // 기술 스택에 따른 특화 프롬프트 추가
  if (context?.techStack?.length) {
    const relevantTechs = context.techStack.filter(
      (tech) => tech in techStackPrompts,
    );
    if (relevantTechs.length > 0) {
      systemPrompt += `관련 기술 스택: ${relevantTechs.join(", ")}\n`;
      relevantTechs.forEach((tech) => {
        systemPrompt +=
          techStackPrompts[tech as keyof typeof techStackPrompts] + "\n";
      });
    }
  }

  return systemPrompt;
};

// 질문 유형 감지 및 특화 프롬프트 생성
export const detectQuestionType = (question: string) => {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes("코드") || lowerQuestion.includes("리뷰")) {
    return "code_review";
  }
  if (
    lowerQuestion.includes("에러") ||
    lowerQuestion.includes("오류") ||
    lowerQuestion.includes("문제")
  ) {
    return "troubleshooting";
  }
  if (
    lowerQuestion.includes("학습") ||
    lowerQuestion.includes("로드맵") ||
    lowerQuestion.includes("공부")
  ) {
    return "learning_path";
  }
  if (
    lowerQuestion.includes("설치") ||
    lowerQuestion.includes("설정") ||
    lowerQuestion.includes("환경")
  ) {
    return "setup";
  }
  if (lowerQuestion.includes("성능") || lowerQuestion.includes("최적화")) {
    return "optimization";
  }

  return "general";
};

export const createSpecializedPrompt = (
  question: string,
  questionType: string,
) => {
  const specializedPrompts: Record<string, string> = {
    code_review: `
      코드 리뷰를 진행하겠습니다. 다음 관점에서 분석해드리겠습니다:
      
      1. **기능성**: 코드가 의도한 기능을 올바르게 수행하는가?
      2. **가독성**: 코드가 이해하기 쉽고 유지보수하기 좋은가?
      3. **성능**: 더 효율적으로 작성할 수 있는 부분이 있는가?
      4. **보안**: 보안 취약점이 있는가?
      5. **베스트 프랙티스**: 해당 언어/프레임워크의 관례를 따르는가?
      
      구체적인 개선 제안과 함께 답변드리겠습니다.
    `,
    troubleshooting: `
      문제 해결을 도와드리겠습니다. 다음 단계로 접근하겠습니다:
      
      1. **문제 분석**: 오류 메시지나 증상을 정확히 파악
      2. **원인 추적**: 문제의 근본 원인을 찾아내기
      3. **해결 방안**: 여러 가지 해결 방법 제시
      4. **예방 방법**: 향후 같은 문제를 방지하는 방법
      
      단계별로 명확하게 설명드리겠습니다.
    `,
    learning_path: `
      학습 로드맵을 제시해드리겠습니다. 다음 구조로 답변하겠습니다:
      
      1. **현재 수준 파악**: 기초, 중급, 고급 중 어느 단계인지
      2. **단계별 학습 계획**: 체계적인 학습 순서 제시
      3. **핵심 개념**: 각 단계에서 꼭 알아야 할 내용
      4. **실습 프로젝트**: 실제 적용해볼 수 있는 프로젝트
      5. **추천 자료**: 책, 강의, 문서 등 학습 리소스
      
      실용적이고 체계적인 학습 방향을 제시하겠습니다.
    `,
    setup: `
      환경 설정을 도와드리겠습니다. 다음 순서로 안내하겠습니다:
      
      1. **필요한 도구**: 설치해야 할 프로그램과 버전
      2. **설치 과정**: 단계별 설치 방법
      3. **설정 파일**: 필요한 설정과 옵션
      4. **검증 방법**: 설치가 올바르게 되었는지 확인하는 방법
      5. **문제 해결**: 자주 발생하는 문제와 해결책
      
      초보자도 따라할 수 있도록 상세히 설명하겠습니다.
    `,
    optimization: `
      성능 최적화를 도와드리겠습니다. 다음 관점에서 분석하겠습니다:
      
      1. **현재 성능 분석**: 병목 지점과 개선 가능한 부분
      2. **최적화 전략**: 다양한 최적화 방법 제시
      3. **측정 방법**: 성능 개선을 확인하는 방법
      4. **트레이드오프**: 성능과 다른 요소들 간의 균형
      5. **모니터링**: 지속적인 성능 관리 방법
      
      실제 성능 향상을 위한 구체적인 방법을 제시하겠습니다.
    `,
  };

  return specializedPrompts[questionType] || "";
};

// 채팅 세션을 사용한 Gemini API 호출
export const postGeminiChat = async (
  sessionId: string,
  userMessage: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  },
) => {
  const session = getChatSession(sessionId);
  if (!session) {
    throw new Error("채팅 세션을 찾을 수 없습니다.");
  }

  // 시스템 프롬프트 생성
  const systemPrompt = createSystemPrompt(session.context);

  // 질문 유형 감지 및 특화 프롬프트 추가
  const questionType = detectQuestionType(userMessage);
  const specializedPrompt = createSpecializedPrompt(userMessage, questionType);

  // 대화 히스토리 구성
  const messages: GeminiMessage[] = [];

  // 시스템 메시지 추가
  messages.push({
    role: "user",
    parts: [{ text: systemPrompt }],
  });

  // 이전 대화 내용 추가 (최근 5개 메시지)
  const recentMessages = session.messages.slice(-10);
  for (const msg of recentMessages) {
    messages.push({
      role: msg.role,
      parts: [{ text: msg.content }],
    });
  }

  // 현재 사용자 메시지 추가
  if (specializedPrompt) {
    messages.push({
      role: "user",
      parts: [{ text: specializedPrompt + "\n\n" + userMessage }],
    });
  } else {
    messages.push({
      role: "user",
      parts: [{ text: userMessage }],
    });
  }

  const requestBody: GeminiRequest = {
    contents: messages,
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 1500,
      topK: 40,
      topP: 0.95,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  try {
    // API 키 확인
    if (!GEMINI_API_KEY) {
      console.error("Gemini API 키가 설정되지 않았습니다.");
      return {
        status: 500,
        message: "Gemini API 키가 설정되지 않았습니다.",
      };
    }

    console.log("Gemini Chat API 호출 시작:", {
      sessionId,
      messageCount: messages.length,
      hasApiKey: !!GEMINI_API_KEY,
      model: "gemini-1.5-flash",
    });

    const response = await axios.post(
      `${GEMINI_URL}:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30초 타임아웃
      },
    );

    const status = response?.status;

    // 사용량 정보 추출
    const usageInfo = {
      model: "gemini-1.5-flash",
      promptTokens: response?.data?.usageMetadata?.promptTokenCount || 0,
      candidatesTokenCount:
        response?.data?.usageMetadata?.candidatesTokenCount || 0,
      totalTokenCount: response?.data?.usageMetadata?.totalTokenCount || 0,
      headers: {
        quotaUser: response?.headers?.["x-quota-user"],
        quotaRemaining: response?.headers?.["x-quota-remaining"],
        quotaLimit: response?.headers?.["x-quota-limit"],
      },
    };

    console.log("Gemini Chat API 응답 상태:", status);
    console.log("Gemini Chat API 사용량 정보:", usageInfo);

    if (status >= 400) {
      console.error("Gemini Chat API 오류 응답:", {
        status,
        statusText: response?.statusText,
        data: response?.data,
        usageInfo,
      });
      return {
        status,
        message: response?.statusText || "API 호출 실패",
        usageInfo,
      };
    }

    const data: GeminiResponse = response.data;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 대화 히스토리에 메시지 추가
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date(),
    });

    session.messages.push({
      role: "model",
      content: reply,
      timestamp: new Date(),
    });

    // 세션 업데이트
    chatSessions.set(sessionId, session);

    console.log("Gemini Chat API 성공 응답:", {
      sessionId,
      hasCandidates: !!data?.candidates,
      candidatesLength: data?.candidates?.length,
      hasReply: !!reply,
      replyLength: reply.length,
      totalMessages: session.messages.length,
      usageInfo,
    });

    return {
      status,
      data: { reply },
      usageInfo,
      sessionId,
    };
  } catch (error: any) {
    console.error("Gemini Chat API Error 상세:", {
      sessionId,
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      config: {
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers,
      },
    });

    // 구체적인 오류 메시지 반환
    let errorMessage = "Gemini API 호출 중 오류가 발생했습니다.";

    if (error?.response?.status === 400) {
      errorMessage = "잘못된 요청입니다. 프롬프트를 확인해주세요.";
    } else if (error?.response?.status === 401) {
      errorMessage = "API 키가 유효하지 않습니다.";
    } else if (error?.response?.status === 403) {
      errorMessage = "API 사용 권한이 없습니다.";
    } else if (error?.response?.status === 429) {
      errorMessage = "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
    } else if (error?.code === "ECONNABORTED") {
      errorMessage = "요청 시간이 초과되었습니다. 다시 시도해주세요.";
    } else if (error?.code === "ENOTFOUND") {
      errorMessage = "API 서버에 연결할 수 없습니다.";
    }

    return {
      status: 500,
      message: errorMessage,
    };
  }
};

// 기존 단일 요청 방식 (하위 호환성을 위해 유지)
export const postGeminiPrompt = async (
  prompt: string,
  options?: {
    temperature?: number;
    maxTokens?: number;
  },
) => {
  const requestBody: GeminiRequest = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature: options?.temperature ?? 0.7,
      maxOutputTokens: options?.maxTokens ?? 1500,
      topK: 40,
      topP: 0.95,
    },
    safetySettings: [
      {
        category: "HARM_CATEGORY_HARASSMENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_HATE_SPEECH",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
      {
        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
        threshold: "BLOCK_MEDIUM_AND_ABOVE",
      },
    ],
  };

  try {
    // API 키 확인
    if (!GEMINI_API_KEY) {
      console.error("Gemini API 키가 설정되지 않았습니다.");
      return {
        status: 500,
        message: "Gemini API 키가 설정되지 않았습니다.",
      };
    }

    console.log("Gemini API 호출 시작:", {
      url: GEMINI_URL,
      hasApiKey: !!GEMINI_API_KEY,
      promptLength: prompt.length,
      model: "gemini-1.5-flash",
    });

    const response = await axios.post(
      `${GEMINI_URL}:generateContent?key=${GEMINI_API_KEY}`,
      requestBody,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000, // 30초 타임아웃
      },
    );

    const status = response?.status;

    // 사용량 정보 추출
    const usageInfo = {
      model: "gemini-1.5-flash",
      promptTokens: response?.data?.usageMetadata?.promptTokenCount || 0,
      candidatesTokenCount:
        response?.data?.usageMetadata?.candidatesTokenCount || 0,
      totalTokenCount: response?.data?.usageMetadata?.totalTokenCount || 0,
      headers: {
        quotaUser: response?.headers?.["x-quota-user"],
        quotaRemaining: response?.headers?.["x-quota-remaining"],
        quotaLimit: response?.headers?.["x-quota-limit"],
      },
    };

    console.log("Gemini API 응답 상태:", status);
    console.log("Gemini API 사용량 정보:", usageInfo);

    if (status >= 400) {
      console.error("Gemini API 오류 응답:", {
        status,
        statusText: response?.statusText,
        data: response?.data,
        usageInfo,
      });
      return {
        status,
        message: response?.statusText || "API 호출 실패",
        usageInfo,
      };
    }

    const data: GeminiResponse = response.data;
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    console.log("Gemini API 성공 응답:", {
      hasCandidates: !!data?.candidates,
      candidatesLength: data?.candidates?.length,
      hasReply: !!reply,
      replyLength: reply.length,
      usageInfo,
    });

    return {
      status,
      data: { reply },
      usageInfo,
    };
  } catch (error: any) {
    console.error("Gemini API Error 상세:", {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      config: {
        url: error?.config?.url,
        method: error?.config?.method,
        headers: error?.config?.headers,
      },
    });

    // 구체적인 오류 메시지 반환
    let errorMessage = "Gemini API 호출 중 오류가 발생했습니다.";

    if (error?.response?.status === 400) {
      errorMessage = "잘못된 요청입니다. 프롬프트를 확인해주세요.";
    } else if (error?.response?.status === 401) {
      errorMessage = "API 키가 유효하지 않습니다.";
    } else if (error?.response?.status === 403) {
      errorMessage = "API 사용 권한이 없습니다.";
    } else if (error?.response?.status === 429) {
      errorMessage = "API 호출 한도를 초과했습니다. 잠시 후 다시 시도해주세요.";
    } else if (error?.code === "ECONNABORTED") {
      errorMessage = "요청 시간이 초과되었습니다. 다시 시도해주세요.";
    } else if (error?.code === "ENOTFOUND") {
      errorMessage = "API 서버에 연결할 수 없습니다.";
    }

    return {
      status: 500,
      message: errorMessage,
    };
  }
};

// 새로운 채팅 기반 기술 메시지 전송 함수
export const sendTechnicalMessage = async (
  question: string,
  context?: UserContext,
) => {
  try {
    // 새로운 채팅 세션 생성
    const sessionId = createChatSession(context);

    const response = await postGeminiChat(sessionId, question);

    if (response?.status >= 400) {
      throw new Error(response?.message);
    }

    return {
      reply: response?.data?.reply || "답변을 생성할 수 없습니다.",
      sessionId,
    };
  } catch (error) {
    console.error("Technical Chat Error:", error);
    return {
      reply:
        "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      sessionId: null,
    };
  }
};

// 기존 채팅 세션에 메시지 전송
export const sendMessageToSession = async (
  sessionId: string,
  message: string,
) => {
  try {
    const response = await postGeminiChat(sessionId, message);

    if (response?.status >= 400) {
      throw new Error(response?.message);
    }

    return {
      reply: response?.data?.reply || "답변을 생성할 수 없습니다.",
      sessionId,
    };
  } catch (error) {
    console.error("Session Chat Error:", error);
    return {
      reply:
        "죄송합니다. 일시적인 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      sessionId: null,
    };
  }
};
