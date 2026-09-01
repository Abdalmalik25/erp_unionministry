import { createRoot } from "react-dom/client";
import App from "./app/App.tsx";
import "./styles/index.css";
import { installGlobalErrorGuards } from "./app/utils/globalErrorGuards";

// حرس الأخطاء العام — قبل أي render: يجعل فشل الصوت/الوسائط غير قاتل على مستوى التطبيق كله
installGlobalErrorGuards();

createRoot(document.getElementById("root")!).render(<App />);