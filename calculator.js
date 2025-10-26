// ========== 전역 변수 ==========
let selectedOptions = {
    majorShareholder: 'major',
    companyType: 'sme',
    listingStatus: 'listed',
    otcTrading: 'yes'
};

// ========== 유틸리티 함수 ==========

// 숫자를 천 단위 구분 형식으로 변환
function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// 쉼표 제거하고 숫자만 추출
function parseFormattedNumber(str) {
    if (!str) return 0;
    return parseFloat(str.toString().replace(/,/g, '')) || 0;
}

// 숫자에 쉼표 추가
function addCommas(value) {
    const numStr = value.toString().replace(/[^\d]/g, '');
    if (!numStr) return '';
    return parseInt(numStr, 10).toLocaleString('ko-KR');
}

// 숫자를 한글로 변환
function numberToKorean(num, unit) {
    if (!num || num === 0) return '';

    const 억 = Math.floor(num / 100000000);
    const 만 = Math.floor((num % 100000000) / 10000);
    const 천 = Math.floor((num % 10000) / 1000);
    const 백 = Math.floor((num % 1000) / 100);
    const 십 = Math.floor((num % 100) / 10);
    const 일 = num % 10;

    let result = '';

    if (억 > 0) result += 억 + '억 ';
    if (만 > 0) result += 만 + '만 ';
    if (천 > 0) result += 천 + '천 ';
    if (백 > 0) result += 백 + '백 ';
    if (십 > 0) result += 십 + '십 ';
    if (일 > 0) result += 일;

    return result.trim() + (unit ? ' (' + unit + ')' : '');
}

// 8자리 숫자를 YYYY.MM.DD 형식으로 변환
function formatDateString(dateStr) {
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
    if (!dateStr || dateStr.length !== 8) return null;

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

// ========== 세율 계산 (수정됨) ==========

function calculateTaxRate(isMajorShareholder, isSME, isListed, isOTC, taxBase, holdingDays) {
    if (taxBase <= 0) {
        return { rate: 0, description: '과세표준 0 이하', progressive: 0, taxable: false };
    }

    // 대주주 외 + 상장 + 거래소거래 = 비과세
    if (!isMajorShareholder && isListed && !isOTC) {
        return { rate: 0, description: '비과세 (대주주 외 상장주식 거래소거래)', progressive: 0, taxable: false };
    }

    const taxBaseInHundredMillion = taxBase / 100000000;

    // 대주주인 경우
    if (isMajorShareholder) {
        // 중소기업 외 + 1년 미만 보유
        if (!isSME && holdingDays < 365) {
            return { rate: 0.30, description: '대주주-중소기업 외, 1년 미만 보유', progressive: 0, taxable: true };
        }

        // 나머지 모든 대주주 경우
        if (taxBaseInHundredMillion <= 3) {
            return { rate: 0.20, description: '대주주, 과표 3억 이하', progressive: 0, taxable: true };
        } else {
            return { rate: 0.25, description: '대주주, 과표 3억 초과', progressive: 15000000, taxable: true };
        }
    }

    // 대주주 외인 경우
    if (!isMajorShareholder) {
        // 중소기업
        if (isSME) {
            return { rate: 0.10, description: '대주주 외-중소기업', progressive: 0, taxable: true };
        }
        // 중소기업 외
        else {
            return { rate: 0.20, description: '대주주 외-중소기업 외', progressive: 0, taxable: true };
        }
    }

    return { rate: 0, description: '알 수 없음', progressive: 0, taxable: false };
}

// ========== 이벤트 핸들러 ==========

// 장외거래 여부 표시/숨김
function toggleOTCTrading() {
    const isMajorShareholder = selectedOptions.majorShareholder === 'major';
    const isListed = selectedOptions.listingStatus === 'listed';

    const otcGroup = document.getElementById('otcTradingGroup');

    // 대주주 외 + 상장일 때만 표시
    if (!isMajorShareholder && isListed) {
        otcGroup.style.display = 'block';
    } else {
        otcGroup.style.display = 'none';
    }

    console.log('OTC Trading visibility:', !isMajorShareholder && isListed);
}

// 버튼 그룹 클릭 이벤트
function setupButtonGroups() {
    document.querySelectorAll('.option-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();

            const group = this.getAttribute('data-group');
            const value = this.getAttribute('data-value');

            console.log('Button clicked:', group, value);

            // 같은 그룹의 모든 버튼에서 active 제거
            document.querySelectorAll(`[data-group="${group}"]`).forEach(b => {
                b.classList.remove('active');
            });

            // 클릭한 버튼에 active 추가
            this.classList.add('active');

            // 전역 변수에 저장
            selectedOptions[group] = value;

            // 장외거래 여부 표시/숨김
            toggleOTCTrading();

            console.log('Selected options:', selectedOptions);
        });
    });
}

// 날짜 입력 이벤트
function setupDateInputs() {
    const dateInputs = ['transferDate', 'acquisitionDate'];

    dateInputs.forEach(id => {
        const input = document.getElementById(id);
        const display = document.getElementById(id + 'Display');

        if (!input || !display) {
            console.error('Date element not found:', id);
            return;
        }

        input.addEventListener('input', function() {
            // 숫자만 입력되도록
            const value = this.value.replace(/[^\d]/g, '');
            this.value = value;

            // 8자리가 되면 날짜 형식으로 표시
            if (value.length === 8) {
                const formatted = formatDateString(value);
                if (formatted) {
                    display.textContent = formatted;
                    display.style.color = '#667eea';
                } else {
                    display.textContent = '올바른 날짜를 입력해주세요';
                    display.style.color = '#d32f2f';
                }
            } else {
                display.textContent = '';
            }

            console.log('Date input:', id, value, 'Formatted:', display.textContent);
        });
    });
}

// 숫자 입력 이벤트
function setupNumberInputs() {
    const inputs = {
        'transferShares': '주',
        'transferPricePerShare': '원',
        'acquisitionShares': '주',
        'acquisitionPricePerShare': '원'
    };

    Object.keys(inputs).forEach(id => {
        const input = document.getElementById(id);
        const koreanDisplay = document.getElementById(id + 'Korean');

        if (!input || !koreanDisplay) {
            console.error('Element not found:', id);
            return;
        }

        input.addEventListener('input', function() {
            const value = this.value.replace(/[^\d]/g, '');

            if (value) {
                // 쉼표 추가
                this.value = addCommas(value);

                // 한글 표시
                const num = parseInt(value, 10);
                koreanDisplay.textContent = numberToKorean(num, inputs[id]);

                console.log('Number input:', id, value, 'Korean:', koreanDisplay.textContent);
            } else {
                this.value = '';
                koreanDisplay.textContent = '';
            }
        });
    });
}

// 계산하기
function calculateTax() {
    console.log('Calculate button clicked');

    try {
        // 입력값 가져오기
        const transferDateStr = document.getElementById('transferDate').value;
        const acquisitionDateStr = document.getElementById('acquisitionDate').value;

        console.log('Dates:', transferDateStr, acquisitionDateStr);

        // 날짜 유효성 검사
        if (transferDateStr.length !== 8 || acquisitionDateStr.length !== 8) {
            alert('양도일자와 취득일자를 8자리 숫자로 입력해주세요 (예: 20240101)');
            return;
        }

        if (!formatDateString(transferDateStr) || !formatDateString(acquisitionDateStr)) {
            alert('올바른 날짜를 입력해주세요');
            return;
        }

        // 선택 값 가져오기
        const isMajorShareholder = selectedOptions.majorShareholder === 'major';
        const isSME = selectedOptions.companyType === 'sme';
        const isListed = selectedOptions.listingStatus === 'listed';
        const isOTC = selectedOptions.otcTrading === 'yes';

        console.log('Options:', { isMajorShareholder, isSME, isListed, isOTC });

        // 숫자 값 가져오기
        const transferShares = parseFormattedNumber(document.getElementById('transferShares').value);
        const transferPricePerShare = parseFormattedNumber(document.getElementById('transferPricePerShare').value);
        const acquisitionShares = parseFormattedNumber(document.getElementById('acquisitionShares').value);
        const acquisitionPricePerShare = parseFormattedNumber(document.getElementById('acquisitionPricePerShare').value);

        console.log('Numbers:', transferShares, transferPricePerShare, acquisitionShares, acquisitionPricePerShare);

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

        console.log('Calculated values:', { transferAmount, acquisitionAmount, capitalGain, taxBase, holdingDays });

        // 세율 계산
        const taxInfo = calculateTaxRate(isMajorShareholder, isSME, isListed, isOTC, taxBase, holdingDays);

        // 양도소득세
        let capitalGainTax;
        if (!taxInfo.taxable) {
            capitalGainTax = 0;
        } else if (taxInfo.progressive > 0) {
            capitalGainTax = Math.max(0, taxBase * taxInfo.rate - taxInfo.progressive);
        } else {
            capitalGainTax = taxBase * taxInfo.rate;
        }

        // 지방소득세
        const localTax = capitalGainTax * 0.1;

        // 합계
        const totalTax = capitalGainTax + localTax;

        console.log('Tax calculated:', capitalGainTax, localTax, totalTax);

        // 결과 표시
        displayResults({
            transferDate: formatDateString(transferDateStr),
            transferAmount,
            transferShares,
            transferPricePerShare,
            acquisitionDate: formatDateString(acquisitionDateStr),
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
    } catch (error) {
        console.error('계산 중 오류 발생:', error);
        alert('계산 중 오류가 발생했습니다: ' + error.message);
    }
}

// 결과 표시
function displayResults(data) {
    console.log('Displaying results:', data);

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
    if (!data.taxInfo.taxable) {
        document.getElementById('resultCapitalGainTaxNote').textContent = '비과세';
    } else if (data.taxInfo.progressive > 0) {
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
    const resultBlock = document.getElementById('resultBlock');
    resultBlock.style.display = 'block';

    // 결과로 스크롤
    setTimeout(() => {
        resultBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    console.log('Results displayed');
}

// ========== 초기화 ==========

// DOM이 로드되면 실행
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

function init() {
    console.log('=== Calculator initializing ===');

    // 버튼 그룹 설정
    setupButtonGroups();
    console.log('Button groups setup complete');

    // 날짜 입력 설정
    setupDateInputs();
    console.log('Date inputs setup complete');

    // 숫자 입력 설정
    setupNumberInputs();
    console.log('Number inputs setup complete');

    // 장외거래 여부 초기 상태 설정
    toggleOTCTrading();

    // 계산하기 버튼
    const calculateBtn = document.getElementById('calculateBtn');
    if (calculateBtn) {
        calculateBtn.addEventListener('click', function(e) {
            e.preventDefault();
            calculateTax();
        });
        console.log('Calculate button listener attached');
    } else {
        console.error('Calculate button not found!');
    }

    // Enter 키로 계산
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                calculateTax();
            }
        });
    });

    console.log('=== Calculator initialization complete ===');
}
