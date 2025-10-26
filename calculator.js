// 숫자를 천 단위 구분 형식으로 변환
function formatNumber(num) {
    return Math.round(num).toLocaleString('ko-KR');
}

// 보유 기간 계산 (일 단위)
function calculateHoldingPeriod(acquisitionDate, transferDate) {
    const diff = new Date(transferDate) - new Date(acquisitionDate);
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

// 세율 계산 함수
function calculateTaxRate(isMajorShareholder, isSME, isListed, taxBase, holdingDays) {
    // 과세표준이 0 이하면 세율 0
    if (taxBase <= 0) {
        return { rate: 0, description: '과세표준 0 이하', progressive: 0 };
    }

    const taxBaseInHundredMillion = taxBase / 100000000; // 억 단위

    // 1. 대주주 - 중소기업 - 상장/비상장
    if (isMajorShareholder && isSME) {
        if (taxBaseInHundredMillion <= 3) {
            return { rate: 0.20, description: '20% (대주주-중소기업, 과표 3억 이하)', progressive: 0 };
        } else {
            return { rate: 0.25, description: '25% (대주주-중소기업, 과표 3억 초과)', progressive: 15000000 };
        }
    }

    // 2. 대주주 - 중소기업 외
    if (isMajorShareholder && !isSME) {
        // 1년 미만 보유 (365일 미만)
        if (holdingDays < 365) {
            return { rate: 0.30, description: '30% (대주주-중소기업 외, 1년 미만 보유)', progressive: 0 };
        }
        // 1년 이상 보유
        if (taxBaseInHundredMillion <= 3) {
            return { rate: 0.20, description: '20% (대주주-중소기업 외, 과표 3억 이하)', progressive: 0 };
        } else {
            return { rate: 0.25, description: '25% (대주주-중소기업 외, 과표 3억 초과)', progressive: 15000000 };
        }
    }

    // 3. 대주주 외 - 중소기업
    if (!isMajorShareholder && isSME) {
        return { rate: 0.10, description: '10% (대주주 외-중소기업)', progressive: 0 };
    }

    // 4. 대주주 외 - 중소기업 외
    if (!isMajorShareholder && !isSME) {
        return { rate: 0.20, description: '20% (대주주 외-중소기업 외)', progressive: 0 };
    }

    return { rate: 0, description: '알 수 없음', progressive: 0 };
}

// 실시간 계산 업데이트
function updateCalculations() {
    // 양도가액 계산
    const transferShares = parseFloat(document.getElementById('transferShares').value) || 0;
    const transferPricePerShare = parseFloat(document.getElementById('transferPricePerShare').value) || 0;
    const transferAmount = transferShares * transferPricePerShare;
    document.getElementById('transferAmount').textContent = formatNumber(transferAmount) + ' 원';

    // 취득가액 계산
    const acquisitionShares = parseFloat(document.getElementById('acquisitionShares').value) || 0;
    const acquisitionPricePerShare = parseFloat(document.getElementById('acquisitionPricePerShare').value) || 0;
    const acquisitionAmount = acquisitionShares * acquisitionPricePerShare;
    document.getElementById('acquisitionAmount').textContent = formatNumber(acquisitionAmount) + ' 원';

    // 증권거래세 계산 (양도가액의 0.35%)
    const transactionTax = transferAmount * 0.0035;
    document.getElementById('transactionTax').textContent = formatNumber(transactionTax) + ' 원';

    // 필요경비 합계
    const otherExpenses = parseFloat(document.getElementById('otherExpenses').value) || 0;
    const totalExpenses = transactionTax + otherExpenses;
    document.getElementById('totalExpenses').textContent = formatNumber(totalExpenses) + ' 원';

    // 양도차익
    const capitalGain = transferAmount - acquisitionAmount - totalExpenses;
    document.getElementById('capitalGain').textContent = formatNumber(capitalGain) + ' 원';

    // 과세표준
    const basicDeduction = document.getElementById('basicDeduction').checked ? 2500000 : 0;
    const taxBase = Math.max(0, capitalGain - basicDeduction);
    document.getElementById('taxBase').textContent = formatNumber(taxBase) + ' 원';
}

// 세금 계산
function calculateTax() {
    // 입력값 검증
    const transferDate = document.getElementById('transferDate').value;
    const acquisitionDate = document.getElementById('acquisitionDate').value;

    if (!transferDate || !acquisitionDate) {
        alert('양도일자와 취득일자를 모두 입력해주세요.');
        return;
    }

    // 선택 사항
    const isMajorShareholder = document.querySelector('input[name="majorShareholder"]:checked').value === 'major';
    const isSME = document.querySelector('input[name="companyType"]:checked').value === 'sme';
    const isListed = document.querySelector('input[name="listingStatus"]:checked').value === 'listed';

    // 계산값
    const transferShares = parseFloat(document.getElementById('transferShares').value) || 0;
    const transferPricePerShare = parseFloat(document.getElementById('transferPricePerShare').value) || 0;
    const transferAmount = transferShares * transferPricePerShare;

    const acquisitionShares = parseFloat(document.getElementById('acquisitionShares').value) || 0;
    const acquisitionPricePerShare = parseFloat(document.getElementById('acquisitionPricePerShare').value) || 0;
    const acquisitionAmount = acquisitionShares * acquisitionPricePerShare;

    const transactionTax = transferAmount * 0.0035;
    const otherExpenses = parseFloat(document.getElementById('otherExpenses').value) || 0;
    const totalExpenses = transactionTax + otherExpenses;

    const capitalGain = transferAmount - acquisitionAmount - totalExpenses;
    const basicDeduction = document.getElementById('basicDeduction').checked ? 2500000 : 0;
    const taxBase = Math.max(0, capitalGain - basicDeduction);

    // 보유 기간 계산
    const holdingDays = calculateHoldingPeriod(acquisitionDate, transferDate);

    // 세율 결정
    const taxInfo = calculateTaxRate(isMajorShareholder, isSME, isListed, taxBase, holdingDays);

    // 양도소득세 계산
    let capitalGainTax;
    if (taxInfo.progressive > 0) {
        // 누진공제가 있는 경우
        capitalGainTax = Math.max(0, taxBase * taxInfo.rate - taxInfo.progressive);
    } else {
        capitalGainTax = taxBase * taxInfo.rate;
    }

    // 지방소득세 (양도소득세의 10%)
    const localTax = capitalGainTax * 0.1;

    // 합계 세액
    const totalTax = capitalGainTax + localTax;

    // 결과 표시
    document.getElementById('taxRate').textContent = taxInfo.description;
    document.getElementById('capitalGainTax').textContent = formatNumber(capitalGainTax) + ' 원';
    document.getElementById('localTax').textContent = formatNumber(localTax) + ' 원';
    document.getElementById('totalTax').textContent = formatNumber(totalTax) + ' 원';

    // 결과 영역 표시
    document.getElementById('resultSection').style.display = 'block';

    // 결과 영역으로 스크롤
    document.getElementById('resultSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 이벤트 리스너 등록
document.addEventListener('DOMContentLoaded', function() {
    // 실시간 계산 업데이트를 위한 이벤트 리스너
    const inputs = [
        'transferShares', 'transferPricePerShare',
        'acquisitionShares', 'acquisitionPricePerShare',
        'otherExpenses'
    ];

    inputs.forEach(id => {
        document.getElementById(id).addEventListener('input', updateCalculations);
    });

    document.getElementById('basicDeduction').addEventListener('change', updateCalculations);

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

    // 초기 계산
    updateCalculations();
});
