import "./App.css";
import { CardInput } from "./components/CardInput";

function App() {
  // BIN 체크 API 호출 예시
  const handleBinCheck = async (bin: string) => {
    console.log("BIN Check:", bin);
    // 실제 API 호출
    // const response = await fetch(`/api/bin-check?bin=${bin}`);
    // return response.json();

    // 테스트용: 2초 대기 후 성공
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log("BIN Check Complete");
        resolve({ success: true });
      }, 2000);
    });
  };

  return (
    <>
      <div className="card">
        <CardInput resetBackOnFrontEdit={true} onBinCheck={handleBinCheck} />
        <p>
          Edit <code>src/App.tsx</code> and save to test HMR
        </p>
      </div>
      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;
