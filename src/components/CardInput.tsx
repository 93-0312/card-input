// src/components/CardInput.tsx
import { useState, useRef, useEffect } from "react";
import {
  formatCardNumber,
  detectCardBrand,
  cleanCardNumber,
  validateCardNumber,
  getGhostText,
} from "../utils/cardFormatter";

// 카드 브랜드 이미지 import
import amexImg from "../assets/images/amex.png";
import visaImg from "../assets/images/visa.png";
import masterImg from "../assets/images/master.png";
import jcbImg from "../assets/images/jcb.png";
import unionpayImg from "../assets/images/unionpay.png";

// 브랜드별 이미지 매핑
const cardImages: Record<string, string> = {
  amex: amexImg,
  visa: visaImg,
  mastercard: masterImg,
  jcb: jcbImg,
  unionpay: unionpayImg,
};

// 표시할 카드 브랜드 순서
const cardBrands = ['visa', 'mastercard', 'amex', 'jcb', 'unionpay'] as const;

interface CardInputProps {
  resetBackOnFrontEdit?: boolean; // 앞블럭 수정 시 뒷블럭 초기화 여부
  onBinCheck?: (bin: string) => Promise<any>; // BIN 체크 API 호출 함수
}

export const CardInput = ({
  resetBackOnFrontEdit = true,
  onBinCheck
}: CardInputProps = {}) => {
  const [frontPart, setFrontPart] = useState(""); // 앞 블럭들 (인풋으로 입력)
  const [block3, setBlock3] = useState(""); // 세 번째 블럭 (키패드 입력)
  const [block4, setBlock4] = useState(""); // 네 번째 블럭 (키패드 입력)
  const [activeBlock, setActiveBlock] = useState<'block3' | 'block4'>('block3');
  const [brand, setBrand] = useState("unknown");
  const [isValid, setIsValid] = useState(false);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [showKeypad, setShowKeypad] = useState(false); // 키패드 표시 여부
  const [binCheckLoading, setBinCheckLoading] = useState(false); // BIN 체크 로딩
  const [binCheckComplete, setBinCheckComplete] = useState(false); // BIN 체크 완료
  const inputRef = useRef<HTMLInputElement>(null);
  const prevFrontPartRef = useRef(""); // 이전 frontPart 값

  // 브랜드에 따른 앞부분 최대 길이 (인풋으로 입력)
  const getFrontMaxLength = (brand: string) => {
    if (brand === "amex") return 4; // 첫 블럭만
    return 8; // 앞 2블럭
  };

  // 브랜드에 따른 블럭3 최대 길이 (키패드 입력)
  const getBlock3MaxLength = (brand: string) => {
    if (brand === "amex") return 6; // 두 번째 블럭
    return 4; // 세 번째 블럭
  };

  // 브랜드에 따른 블럭4 최대 길이 (키패드 입력)
  const getBlock4MaxLength = (brand: string) => {
    if (brand === "amex") return 5; // 세 번째 블럭
    return 4; // 네 번째 블럭
  };

  // 전체 카드 번호 계산 (실제 숫자)
  const fullCardNumber = frontPart + block3 + block4;

  // 프론트 블럭 입력 완료 여부
  const isFrontComplete = brand !== "unknown" && frontPart.length === getFrontMaxLength(brand);

  // block3 입력 가능 여부 (binCheck 완료 후)
  const isBlock3Enabled = binCheckComplete;

  // block4 입력 가능 여부 (block3 완료 후)
  const isBlock4Enabled = block3.length === getBlock3MaxLength(brand);

  // ===== Display Helpers =====

  /**
   * 블럭 템플릿 가져오기
   */
  const getBlockTemplate = (blockName: 'block3' | 'block4'): string => {
    if (blockName === 'block3') {
      return brand === 'amex' ? '123456' : '1234';
    }
    return brand === 'amex' ? '12345' : '1234';
  };

  /**
   * 블럭 표시 (마스킹 + 고스트)
   */
  const displayBlock = (blockValue: string, blockName: 'block3' | 'block4'): string => {
    const template = getBlockTemplate(blockName);
    const masked = blockValue.split('').map(() => '•').join('');
    const ghost = template.slice(blockValue.length);
    return masked + ghost;
  };

  /**
   * 화면에 표시할 카드 번호 생성
   */
  const getDisplayCardNumber = (): string => {
    const front = formatCardNumber(frontPart);

    if (!block3 && !block4) {
      return front;
    }

    const display3 = displayBlock(block3, 'block3');
    const display4 = displayBlock(block4, 'block4');
    const parts = [front, display3, display4].filter(p => p);
    return parts.join(' ');
  };

  const displayCardNumber = getDisplayCardNumber();

  // ===== Helper Functions =====

  /**
   * input value에서 프론트 영역만 추출
   */
  const extractFrontPartFromInput = (value: string, currentBrand: string): string => {
    const frontMaxLength = getFrontMaxLength(currentBrand);
    const frontMaxFormatted = formatCardNumber('9'.repeat(frontMaxLength)).length;
    const frontPartValue = value.slice(0, frontMaxFormatted);
    return frontPartValue.replace(/[•\s]/g, '').replace(/\D/g, '');
  };

  /**
   * 브랜드 변경 시 프론트 블럭 길이 조정
   */
  const adjustFrontPartForBrandChange = (
    frontPart: string,
    oldBrand: string,
    newBrand: string
  ): string => {
    const oldMaxLength = getFrontMaxLength(oldBrand);
    const newMaxLength = getFrontMaxLength(newBrand);

    // 브랜드 변경으로 프론트 길이가 줄어든 경우 초과분 제거
    if (newMaxLength < oldMaxLength && frontPart.length > newMaxLength) {
      return frontPart.slice(0, newMaxLength);
    }
    return frontPart;
  };

  /**
   * 뒷블럭 초기화 여부 판단
   */
  const shouldResetBackBlocks = (
    newFrontPart: string,
    prevFrontPart: string,
    newBrand: string,
    oldBrand: string,
    hasBackBlocks: boolean
  ): boolean => {
    if (!resetBackOnFrontEdit || !hasBackBlocks) return false;

    // 프론트 값 변경 또는 브랜드 변경 시 초기화
    return newFrontPart !== prevFrontPart || newBrand !== oldBrand;
  };

  /**
   * 뒷블럭 초기화
   */
  const resetBackBlocks = () => {
    setBlock3("");
    setBlock4("");
    setActiveBlock('block3');
    setShowKeypad(false);
    setBinCheckComplete(false);
  };

  /**
   * 커서 위치 계산
   */
  const calculateCursorPosition = (
    formattedValue: string,
    digitsBeforeCursor: number
  ): number => {
    let newCursorPos = 0;
    let digitCount = 0;

    for (let i = 0; i < formattedValue.length; i++) {
      if (formattedValue[i] !== " ") {
        digitCount++;
      }
      if (digitCount === digitsBeforeCursor) {
        newCursorPos = i + 1;
        break;
      }
    }

    return newCursorPos;
  };

  // ===== Main Handler =====

  const handleFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const cursorPos = e.target.selectionStart || 0;

    // 1. 현재 브랜드 결정
    const currentBrand = brand !== 'unknown' ? brand : detectCardBrand(frontPart);

    // 2. 프론트 영역만 추출
    const cleanedValue = extractFrontPartFromInput(value, currentBrand);

    // 3. 새 브랜드 감지
    const detectedBrand = detectCardBrand(cleanedValue);
    const detectedFrontMaxLength = getFrontMaxLength(detectedBrand);

    // 4. 브랜드 변경 시 프론트 길이 조정
    const brandChanged = detectedBrand !== currentBrand;
    let newFrontPart = cleanedValue;
    if (brandChanged) {
      // 브랜드 변경 시 길이 조정
      newFrontPart = adjustFrontPartForBrandChange(cleanedValue, currentBrand, detectedBrand);
    }
    // 최종적으로 최대 길이로 제한
    newFrontPart = newFrontPart.slice(0, detectedFrontMaxLength);

    // 5. 길이 초과 시 무시 (단, 브랜드 변경으로 인한 경우는 예외)
    if (!brandChanged && cleanedValue.length > detectedFrontMaxLength) return;

    // 6. 뒷블럭 초기화 여부 체크 및 실행
    const hasBackBlocks = Boolean(block3 || block4);
    let didReset = false;
    if (shouldResetBackBlocks(newFrontPart, prevFrontPartRef.current, detectedBrand, brand, hasBackBlocks)) {
      resetBackBlocks();
      didReset = true;
    }

    // 7. 커서 위치 계산
    const beforeCursor = value.slice(0, cursorPos).replace(/•/g, '');
    const digitsBeforeCursor = cleanCardNumber(beforeCursor).length;

    // 8. 상태 업데이트
    setFrontPart(newFrontPart);
    setBrand(detectedBrand);
    prevFrontPartRef.current = newFrontPart;

    // 9. 프론트 블럭 완료 시 키패드 표시 (초기화하지 않은 경우만)
    const isFrontCompleteNow = newFrontPart.length === detectedFrontMaxLength && detectedBrand !== "unknown";
    if (!didReset && isFrontCompleteNow) {
      setShowKeypad(true);
    }

    // 10. 커서 위치 설정
    const formattedFront = formatCardNumber(newFrontPart);
    const newCursorPos = calculateCursorPosition(formattedFront, digitsBeforeCursor);
    setCursorPosition(newCursorPos);
  };

  // ===== Keypad Handlers =====

  /**
   * 키패드 숫자 입력
   */
  const handleKeypadNumber = (num: string) => {
    if (activeBlock === 'block3' && isBlock3Enabled) {
      const maxLength = getBlock3MaxLength(brand);
      if (block3.length >= maxLength) return;

      const newBlock3 = block3 + num;
      setBlock3(newBlock3);

      // 블럭3 완성 시 블럭4로 자동 전환
      if (newBlock3.length === maxLength) {
        setActiveBlock('block4');
      }
    } else if (activeBlock === 'block4' && isBlock4Enabled) {
      const maxLength = getBlock4MaxLength(brand);
      if (block4.length >= maxLength) return;

      setBlock4(block4 + num);
    }
  };

  /**
   * 키패드 삭제
   */
  const handleKeypadDelete = () => {
    if (activeBlock === 'block3') {
      setBlock3(block3.slice(0, -1));
    } else if (activeBlock === 'block4') {
      if (block4.length > 0) {
        setBlock4(block4.slice(0, -1));
      } else {
        // 블럭4가 비어있으면 블럭3으로 이동
        setActiveBlock('block3');
      }
    }
  };

  // 유효성 검증
  useEffect(() => {
    if (fullCardNumber.length >= 13) {
      setIsValid(validateCardNumber(fullCardNumber));
    } else {
      setIsValid(false);
    }
  }, [fullCardNumber]);

  // 뒷블럭에 값이 있으면 키패드 자동 표시
  useEffect(() => {
    if (isFrontComplete && (block3 || block4)) {
      setShowKeypad(true);
    }
  }, [block3, block4, isFrontComplete]);

  // 프론트 완료 시 BIN 체크 호출
  useEffect(() => {
    if (isFrontComplete && onBinCheck && !binCheckComplete && !binCheckLoading) {
      setBinCheckLoading(true);
      onBinCheck(frontPart)
        .then(() => {
          setBinCheckComplete(true);
          setBinCheckLoading(false);
        })
        .catch((error) => {
          console.error('BIN check failed:', error);
          setBinCheckLoading(false);
        });
    }
  }, [isFrontComplete, frontPart, onBinCheck, binCheckComplete, binCheckLoading]);

  // 커서 위치 업데이트 및 제한
  useEffect(() => {
    if (inputRef.current && cursorPosition !== null) {
      inputRef.current.setSelectionRange(cursorPosition, cursorPosition);
    }
  }, [cursorPosition, frontPart]);

  // 커서가 뒷블럭 영역으로 이동하는 것을 방지
  useEffect(() => {
    const input = inputRef.current;
    if (!input || !block3 && !block4) return;

    const handleClick = () => {
      const cursorPos = input.selectionStart || 0;
      const frontFormatted = formatCardNumber(frontPart);
      const maxPos = frontFormatted.length;

      if (cursorPos > maxPos) {
        input.setSelectionRange(maxPos, maxPos);
      }
    };

    input.addEventListener('click', handleClick);
    return () => input.removeEventListener('click', handleClick);
  }, [frontPart, block3, block4]);

  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          카드 번호
        </label>

        {/* 모든 카드 브랜드 로고 표시 (입력 필드 밖) */}
        <div className="flex gap-2">
          {cardBrands.map((cardBrand) => (
            <img
              key={cardBrand}
              src={cardImages[cardBrand]}
              alt={cardBrand}
              className={`h-6 w-auto transition-opacity duration-200 ${
                brand === "unknown" || brand === cardBrand
                  ? "opacity-100"
                  : "opacity-30"
              }`}
            />
          ))}
        </div>
      </div>

      <div className="relative">
        {/* 고스트 텍스트 */}
        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-lg tracking-wider text-gray-300 select-none">
          <span className="invisible">{displayCardNumber}</span>
          <span>{getGhostText(displayCardNumber, brand)}</span>
        </div>

        <input
          ref={inputRef}
          type="text"
          value={displayCardNumber}
          onChange={handleFrontChange}
          onKeyDown={(e) => {
            // 뒷블럭이 있을 때 백스페이스를 누르면 커서가 프론트 끝보다 뒤에 있으면 무시
            if (e.key === 'Backspace' && (block3 || block4)) {
              const cursorPos = e.currentTarget.selectionStart || 0;
              const frontFormatted = formatCardNumber(frontPart);
              if (cursorPos > frontFormatted.length) {
                e.preventDefault();
              }
            }
          }}
          className={`w-full px-4 py-3 pr-16 border rounded-lg text-lg tracking-wider bg-transparent relative z-10
            ${
              isValid
                ? "border-green-500 focus:ring-green-500"
                : "border-gray-300 focus:ring-blue-500"
            }
            focus:ring-2 focus:border-transparent`}
        />

        {/* 감지된 카드 브랜드 로고 (입력 필드 안) */}
        {brand !== "unknown" && cardImages[brand] && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 z-20">
            <img
              src={cardImages[brand]}
              alt={brand}
              className="h-8 w-auto"
            />
          </div>
        )}
      </div>

      {/* BIN 체크 로딩 */}
      {isFrontComplete && binCheckLoading && (
        <div className="mt-4 text-center">
          <div className="inline-block px-4 py-2 bg-gray-100 rounded-lg text-gray-600">
            카드 정보 확인 중...
          </div>
        </div>
      )}

      {/* 키패드 활성화 버튼 (프론트 완료 & BIN 체크 완료 후) */}
      {isFrontComplete && binCheckComplete && !showKeypad && (
        <div className="mt-4">
          <button
            onClick={() => setShowKeypad(true)}
            className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors"
          >
            뒷자리 입력하기
          </button>
        </div>
      )}

      {/* 가상 키패드 (입력 중일 때만 표시) */}
      {showKeypad && isFrontComplete && binCheckComplete && (
        <div className="mt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-medium text-gray-700">
              뒷자리 입력 (키패드 사용)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveBlock('block3')}
                disabled={!isBlock3Enabled}
                className={`px-3 py-1 text-xs rounded ${
                  activeBlock === 'block3'
                    ? 'bg-blue-500 text-white'
                    : isBlock3Enabled
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {brand === 'amex' ? '블럭 2' : '블럭 3'} ({block3.length}/{getBlock3MaxLength(brand)})
              </button>
              <button
                onClick={() => setActiveBlock('block4')}
                disabled={!isBlock4Enabled}
                className={`px-3 py-1 text-xs rounded ${
                  activeBlock === 'block4'
                    ? 'bg-blue-500 text-white'
                    : isBlock4Enabled
                    ? 'bg-gray-200 text-gray-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {brand === 'amex' ? '블럭 3' : '블럭 4'} ({block4.length}/{getBlock4MaxLength(brand)})
              </button>
              <button
                onClick={() => setShowKeypad(false)}
                className="px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 max-w-[240px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((num) => {
              const isDisabled = (activeBlock === 'block3' && !isBlock3Enabled) ||
                                 (activeBlock === 'block4' && !isBlock4Enabled);
              return (
                <button
                  key={num}
                  onClick={() => handleKeypadNumber(String(num))}
                  disabled={isDisabled}
                  className={`h-12 border rounded-lg font-semibold text-lg transition-colors ${
                    isDisabled
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  {num}
                </button>
              );
            })}
            <button
              onClick={handleKeypadDelete}
              className="h-12 border border-gray-300 rounded-lg hover:bg-gray-100 active:bg-gray-200 font-semibold text-lg transition-colors col-span-2"
            >
              ← 삭제
            </button>
          </div>
        </div>
      )}

      {displayCardNumber && (
        <div className="mt-2 flex items-center gap-2 text-sm">
          <span className="capitalize text-gray-600">{brand}</span>
          {isValid && (
            <span className="text-green-600 font-semibold">✓ 유효</span>
          )}
          {!isValid && fullCardNumber.length >= 13 && (
            <span className="text-red-600">✗ 유효하지 않음</span>
          )}
        </div>
      )}
    </div>
  );
};
