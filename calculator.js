// ========== 유틸리티 함수 ==========

// 숫자를 천 단위 구분 형식으로 변환
function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// 쉼표 제거하고 숫자만 추출
function parseFormattedNumber(str) {
    return parseFloat(str.replace(/,/g, '')) || 0;
}

// 숫자에 쉼표 추가
function addCommas(str) {
    // 숫자만 남기기
    const numStr = str.replace(/[^\d]/g, '');
    if (!numStr) return '';

    // 쉼표 추가
    return parseInt(numStr).toLocaleString('ko-KR');
}

// 숫자를 한글로 변환
function numberToKorean(num, unit) {
    if (!num || num === 0) return '';

    const units = ['', '만', '억', '조'];
    const smallUnits = ['천', '백', '십', ''];

    let result = [];
    let unitIndex = 0;

    while (num > 0) {
        const segment = num % 10000;

        if (segment > 0) {
            let segmentStr = '';
            let temp = segment;
            let smallUnitIndex = 0;

            // 천, 백, 십, 일 단위 처리
            if (temp >= 1000) {
                const thousand = Math.floor(temp / 1000);
                if (thousand === 1) {
                    segmentStr = '1천';
                } else {
                    segmentStr = thousand + '천';
                }
                temp %= 1000;
            }

            if (temp >= 100) {
                const hundred = Math.floor(temp / 100);
                if (segmentStr) segmentStr += ' ';
                if (hundred === 1) {
                    segmentStr += '1백';
                } else {
                    segmentStr += hundred + '백';
                }
                temp %= 100;
            }

            if (temp >= 10) {
                const ten = Math.floor(temp / 10);
                if (segmentStr) segmentStr += ' ';
                if (ten === 1) {
                    segmentStr += '1십';
                } else {
                    segmentStr += ten + '십';
                }
                temp %= 10;
            }

            if (temp > 0) {
                if (segmentStr) segmentStr += ' ';
                segmentStr += temp;
            }

            if (units[unitIndex]) {
                segmentStr += units[unitIndex];
            }

            result.unshift(segmentStr);
        }

        num = Math.floor(num / 10000);
        unitIndex++;
    }

    return result.join(' ') + (unit ? `(${unit})` : '');
}

// 날짜 포맷팅 (YYYYMMDD -> YYYY.MM.DD)
function formatDate(dateStr) {
    if (dateStr.length !== 8) return '';

    const year = dateStr.substring(0, 4);
    const month = dateStr.substring(4, 6);
    const day = dateStr.substring(6, 8);

    // 유효성 검사
    const monthNum = parseInt(month);
    const dayNum = parseInt(day);

    if (monthNum < 1 || monthNum > 12 || dayNum < 1 || dayNum > 31) {
        return '';
    }

    return `${year}.${month}.${day}`;
}

// 날짜 문자열을 Date 객체로 변환
function parseDateString(dateStr) {
    if (dateStr.length !== 8) return null;

    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));

    return new Date(year, month, day);
}

// 보유 기간 계산 (일 단위)
function calculateHoldingPeriod(acquisitionDateStr, transferDateStr) {
    const acquisitionDate = parseDateString(acquisitionDateStr);
    const transferDate = parseDateString(transferDateStr);

    if (!acquisitionDate || !transferDate) return 0;

    const diff = transferDate - acquisitionDate;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// ========== 세율 계산 ==========

function calculateTaxRate(isMajorShareholder, isSME, isListed, taxBase, holdingDays) {
    if (taxBase <= 0) {
        return { rate: 0, description: '과세표준 0 이하', progressive: 0 };
    }

    const taxBaseInHundredMillion = taxBase / 100000000;

    // 1. 대주주 - 중소기업
    if (isMajorShareholder && isSME) {
        if (taxBaseInHundredMillion <= 3) {
            return { rate: 0.20, description: '대주주-중소기업, 과표 3억 이하', progressive: 0 };
        } else {
            return { rate: 0.25, description: '대주주-중소기업, 과표 3억 초과', progressive: 15000000 };
        }
    }

    // 2. 대주주 - 중소기업 외
    if (isMajorShareholder && !isSME) {
        if (holdingDays < 365) {
            return { rate: 0.30, description: '대주주-중소기업 외, 1년 미만 보유', progressive: 0 };
        }
        if (taxBaseInHundredMillion <= 3) {
            return { rate: 0.20, description: '대주주-중소기업 외, 과표 3억 이하', progressive: 0 };
        } else {
            return { rate: 0.25, description: '대주주-중소기업 외, 과표 3억 초과', progressive: 15000000 };
        }
    }

    // 3. 대주주 외 - 중소기업
    if (!isMajorShareholder && isSME) {
        return { rate: 0.10, description: '대주주 외-중소기업', progressive: 0 };
    }

    // 4. 대주주 외 - 중소기업 외
    if (!isMajorShareholder && !isSME) {
        return { rate: 0.20, description: '대주주 외-중소기업 외', progressive: 0 };
    }

    return { rate: 0, description: '알 수 없음', progressive: 0 };
}

// ========== 이벤트 핸들러 ==========

// 버튼 그룹 클릭 이벤트
function handleOptionButtonClick(e) {
    const button = e.target;
    if (!button.classList.contains('option-btn')) return;

    const group = button.dataset.group;
    const value = button.dataset.value;

    // 같은 그룹의 모든 버튼에서 active 제거
    document.querySelectorAll(`[data-group="${group}"]`).forEach(btn => {
        btn.classList.remove('active');
    });

    // 클릭한 버튼에 active 추가
    button.classList.add('active');
}

// 날짜 입력 이벤트
function handleDateInput(e) {
    const input = e.target;
    const displayId = input.id + 'Display';
    const displayElement = document.getElementById(displayId);

    // 숫자만 입력되도록
    const value = input.value.replace(/[^\d]/g, '');
    input.value = value;

    // 8자리가 되면 날짜 형식으로 표시
    if (value.length === 8) {
        const formatted = formatDate(value);
        if (formatted) {
            displayElement.textContent = formatted;
        } else {
            displayElement.textContent = '올바른 날짜를 입력해주세요';
            displayElement.style.color = '#d32f2f';
        }
    } else {
        displayElement.textContent = '';
    }
}

// 숫자 입력 이벤트
function handleNumberInput(e) {
    const input = e.target;
    const koreanId = input.id + 'Korean';
    const koreanElement = document.getElementById(koreanId);

    // 숫자만 추출
    const value = input.value.replace(/[^\d]/g, '');

    if (value) {
        // 쉼표 추가
        input.value = addCommas(value);

        // 한글 표시
        const num = parseInt(value);
        let unit = '';
        if (input.id.includes('Shares')) {
            unit = '주';
        } else if (input.id.includes('Price')) {
            unit = '원';
        }
        koreanElement.textContent = numberToKorean(num, unit);
    } else {
        input.value = '';
        koreanElement.textContent = '';
    }
}

// 계산하기
function calculateTax() {
    // 입력값 가져오기
    const transferDateStr = document.getElementById('transferDate').value;
    const acquisitionDateStr = document.getElementById('acquisitionDate').value;

    // 날짜 유효성 검사
    if (transferDateStr.length !== 8 || acquisitionDateStr.length !== 8) {
        alert('양도일자와 취득일자를 8자리 숫자로 입력해주세요 (예: 20240101)');
        return;
    }

    if (!formatDate(transferDateStr) || !formatDate(acquisitionDateStr)) {
        alert('올바른 날짜를 입력해주세요');
        return;
    }

    // 선택 값 가져오기
    const isMajorShareholder = document.querySelector('[data-group="majorShareholder"].active').dataset.value === 'major';
    const isSME = document.querySelector('[data-group="companyType"].active').dataset.value === 'sme';
    const isListed = document.querySelector('[data-group="listingStatus"].active').dataset.value === 'listed';

    // 숫자 값 가져오기
    const transferShares = parseFormattedNumber(document.getElementById('transferShares').value);
    const transferPricePerShare = parseFormattedNumber(document.getElementById('transferPricePerShare').value);
    const acquisitionShares = parseFormattedNumber(document.getElementById('acquisitionShares').value);
    const acquisitionPricePerShare = parseFormattedNumber(document.getElementById('acquisitionPricePerShare').value);

    if (!transferShares || !transferPricePerShare || !acquisitionShares || !acquisitionPricePerShare) {
        alert('모든 숫자 입력 항목을 입력해주세요');
        return;
    }

    // 계산
    const transferAmount = transferShares * transferPricePerShare;
    const acquisitionAmount = acquisitionShares * acquisitionPricePerShare;
    const transactionTax = transferAmount * 0.0035; // 증권거래세 0.35%
    const totalExpenses = transactionTax;
    const capitalGain = transferAmount - acquisitionAmount - totalExpenses;
    const basicDeduction = document.getElementById('basicDeduction').checked ? 2500000 : 0;
    const taxBase = Math.max(0, capitalGain - basicDeduction);

    // 보유 기간
    const holdingDays = calculateHoldingPeriod(acquisitionDateStr, transferDateStr);

    // 세율 계산
    const taxInfo = calculateTaxRate(isMajorShareholder, isSME, isListed, taxBase, holdingDays);

    // 양도소득세
    let capitalGainTax;
    if (taxInfo.progressive > 0) {
        capitalGainTax = Math.max(0, taxBase * taxInfo.rate - taxInfo.progressive);
    } else {
        capitalGainTax = taxBase * taxInfo.rate;
    }

    // 지방소득세
    const localTax = capitalGainTax * 0.1;

    // 합계
    const totalTax = capitalGainTax + localTax;

    // 결과 표시
    displayResults({
        transferDate: formatDate(transferDateStr),
        transferAmount,
        transferShares,
        transferPricePerShare,
        acquisitionDate: formatDate(acquisitionDateStr),
        acquisitionAmount,
        acquisitionShares,
        acquisitionPricePerShare,
        totalExpenses,
        transactionTax,
        capitalGain,
        basicDeduction,
        taxBase,
        taxInfo,
        capitalGainTax,
        localTax,
        totalTax
    });
}

// 결과 표시
function displayResults(data) {
    // 양도가액
    document.getElementById('resultTransferDate').textContent = data.transferDate;
    document.getElementById('resultTransferAmount').textContent = formatNumber(data.transferAmount) + ' 원';
    document.getElementById('resultTransferNote').textContent =
        `${formatNumber(data.transferShares)}주 × ${formatNumber(data.transferPricePerShare)}원`;

    // 취득가액
    document.getElementById('resultAcquisitionDate').textContent = data.acquisitionDate;
    document.getElementById('resultAcquisitionAmount').textContent = formatNumber(data.acquisitionAmount) + ' 원';
    document.getElementById('resultAcquisitionNote').textContent =
        `${formatNumber(data.acquisitionShares)}주 × ${formatNumber(data.acquisitionPricePerShare)}원`;

    // 필요경비
    document.getElementById('resultExpenses').textContent = formatNumber(data.totalExpenses) + ' 원';
    document.getElementById('resultExpensesNote').textContent =
        `증권거래세: ${formatNumber(data.transactionTax)}원`;

    // 양도차익
    document.getElementById('resultCapitalGain').textContent = formatNumber(data.capitalGain) + ' 원';

    // 기본공제
    document.getElementById('resultBasicDeduction').textContent = formatNumber(data.basicDeduction) + ' 원';
    document.getElementById('resultBasicDeductionNote').textContent =
        data.basicDeduction > 0 ? '기본공제 적용' : '기본공제 미적용';

    // 과세표준
    document.getElementById('resultTaxBase').textContent = formatNumber(data.taxBase) + ' 원';

    // 세율
    const ratePercent = (data.taxInfo.rate * 100).toFixed(0) + '%';
    document.getElementById('resultTaxRate').textContent = ratePercent;
    document.getElementById('resultTaxRateNote').textContent = data.taxInfo.description;

    // 양도소득세
    document.getElementById('resultCapitalGainTax').textContent = formatNumber(data.capitalGainTax) + ' 원';
    if (data.taxInfo.progressive > 0) {
        document.getElementById('resultCapitalGainTaxNote').textContent =
            `과세표준 × ${ratePercent} - 누진공제 ${formatNumber(data.taxInfo.progressive)}원`;
    } else {
        document.getElementById('resultCapitalGainTaxNote').textContent =
            `과세표준 × ${ratePercent}`;
    }

    // 지방소득세
    document.getElementById('resultLocalTax').textContent = formatNumber(data.localTax) + ' 원';

    // 합계 세액
    document.getElementById('resultTotalTax').textContent = formatNumber(data.totalTax) + ' 원';

    // 결과 블록 표시
    document.getElementById('resultBlock').style.display = 'block';

    // 결과로 스크롤
    document.getElementById('resultBlock').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== 초기화 ==========

document.addEventListener('DOMContentLoaded', function() {
    // 버튼 그룹 이벤트 리스너
    document.querySelectorAll('.button-group').forEach(group => {
        group.addEventListener('click', handleOptionButtonClick);
    });

    // 날짜 입력 이벤트 리스너
    document.getElementById('transferDate').addEventListener('input', handleDateInput);
    document.getElementById('acquisitionDate').addEventListener('input', handleDateInput);

    // 숫자 입력 이벤트 리스너
    document.getElementById('transferShares').addEventListener('input', handleNumberInput);
    document.getElementById('transferPricePerShare').addEventListener('input', handleNumberInput);
    document.getElementById('acquisitionShares').addEventListener('input', handleNumberInput);
    document.getElementById('acquisitionPricePerShare').addEventListener('input', handleNumberInput);

    // 계산하기 버튼
    document.getElementById('calculateBtn').addEventListener('click', calculateTax);

    // Enter 키로 계산
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                calculateTax();
            }
        });
    });
});
