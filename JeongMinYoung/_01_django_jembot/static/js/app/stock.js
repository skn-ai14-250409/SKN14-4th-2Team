document.getElementById('stockInput').addEventListener('keydown', function(event) {
    if (event.key === 'Enter') {
      // 엔터 키가 눌렸을 때 실행할 코드
      const stockName = document.getElementById("stockInput").value.trim();
      const resultBox = document.getElementById("resultBox");

      if (!stockName) {
        resultBox.textContent = "기업명을 입력해주세요.";
        return;
      }

      resultBox.textContent = "분석 중입니다...";

      fetch("/stock/analysis/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCSRFToken() // Django 사용 시
        },
        body: JSON.stringify({corp_name: stockName})
      })
          .then((response) => {
            if (!response.ok) {
              throw new Error("HTTP 오류 상태: " + response.status);
            }
            return response.json();
          })
          .then((data) => {
            resultBox.textContent = data['answer'] || "분석 결과가 없습니다.";
          })
          .catch((error) => {
            console.error("에러 발생:", error);
            resultBox.textContent = "서버 오류가 발생했습니다. 다시 시도해주세요.";
          });
    }
});  // 이 부분에서 추가된 괄호가 필요함


document.getElementById("searchBtn").onclick = () => {
  const stockName = document.getElementById("stockInput").value.trim();
  const resultBox = document.getElementById("resultBox");

  if (!stockName) {
    resultBox.textContent = "기업명을 입력해주세요.";
    return;
  }

  resultBox.textContent = "분석 중입니다...";

  fetch("/stock/analysis/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CSRFToken": getCSRFToken() // Django 사용 시
    },
    body: JSON.stringify({ corp_name: stockName })
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error("HTTP 오류 상태: " + response.status);
      }
      return response.json();
    })
    .then((data) => {
      resultBox.textContent = data['answer'] || "분석 결과가 없습니다.";
    })
    .catch((error) => {
      console.error("에러 발생:", error);
      resultBox.textContent = "서버 오류가 발생했습니다. 다시 시도해주세요.";
    });
};

function getCSRFToken() {
  const cookieValue = document.cookie
    .split("; ")
    .find((row) => row.startsWith("csrftoken="));
  return cookieValue ? cookieValue.split("=")[1] : "";
}