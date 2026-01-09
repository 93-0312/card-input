// src/utils/cardFormatter.ts

/**
 * 카드 브랜드 감지
 */
export const detectCardBrand = (number: string): string => {
  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2(2[2-9][0-9]|[3-6][0-9]{2}|7[0-1][0-9]|720))/,
    amex: /^3[47]/,
    discover: /^6(?:011|5)/,
    diners: /^3(?:0[0-5]|[68])/,
    jcb: /^35/,
    unionpay: /^62/,
  };

  for (const [brand, pattern] of Object.entries(patterns)) {
    if (pattern.test(number)) {
      return brand;
    }
  }

  return "unknown";
};

/**
 * 카드 번호 포맷팅
 * Amex: 4-6-5 (e.g., 3782 822463 10005)
 * 나머지: 4-4-4-4 (e.g., 4242 4242 4242 4242)
 */
export const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\s/g, "");
  const brand = detectCardBrand(cleaned);

  // Amex: 4-6-5 (실시간 포맷팅)
  if (brand === "amex") {
    if (cleaned.length <= 4) {
      return cleaned;
    } else if (cleaned.length <= 10) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 10)} ${cleaned.slice(
        10
      )}`;
    }
  }

  // 나머지: 4-4-4-4
  return cleaned.replace(/(\d{4})/g, "$1 ").trim();
};

/**
 * 숫자만 추출
 */
export const cleanCardNumber = (value: string): string => {
  return value.replace(/\D/g, "");
};

/**
 * Luhn 알고리즘 - 카드 번호 유효성 검증
 */
export const validateCardNumber = (number: string): boolean => {
  const cleaned = cleanCardNumber(number);

  if (cleaned.length < 13 || cleaned.length > 19) {
    return false;
  }

  let sum = 0;
  let isEven = false;

  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i]);

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * 카드 번호 최대 길이 반환
 */
export const getMaxLength = (brand: string): number => {
  if (brand === "amex") return 15;
  if (brand === "diners") return 14;
  return 16;
};

/**
 * 브랜드별 고스트 템플릿 반환
 */
export const getCardTemplate = (brand: string): string => {
  if (brand === "amex") {
    return "1234 123456 12345";
  }
  return "1234 1234 1234 1234";
};

/**
 * 입력값에 맞춰 고스트 텍스트 생성
 */
export const getGhostText = (currentValue: string, brand: string): string => {
  const template = getCardTemplate(brand);
  // 현재 입력값의 포맷팅된 길이만큼 템플릿에서 제거
  return template.slice(currentValue.length);
};
