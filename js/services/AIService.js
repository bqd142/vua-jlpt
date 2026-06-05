// js/services/AIService.js
const AIService = {
    async explainQuestion(apiKey, questionData, passageData, sectionType, mondaiNumber) {
        if (!apiKey) throw new Error("Vui lòng cung cấp API Key.");

        const cleanKey = apiKey.trim();

        // --- BƯỚC 1: TỰ ĐỘNG DÒ TÌM MODEL ---
        let targetModel = "";
        try {
            const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${cleanKey}`;
            const listRes = await fetch(listUrl);
            if (!listRes.ok) throw new Error("Không thể kiểm tra danh sách Model.");
            
            const listData = await listRes.json();
            const validModels = listData.models.filter(m => 
                m.supportedGenerationMethods && 
                m.supportedGenerationMethods.includes("generateContent")
            );

            if (validModels.length === 0) throw new Error("API Key không có quyền sử dụng AI.");
            const preferredModel = validModels.find(m => m.name.includes("flash")) || validModels[0];
            targetModel = preferredModel.name.replace("models/", "");
        } catch (err) {
            console.error("Lỗi dò Model:", err);
            targetModel = "gemini-1.5-flash"; 
        }

        // --- BƯỚC 2: XÂY DỰNG NGỮ CẢNH (CONTEXT) ---
        let context = `Dưới đây là dữ liệu câu hỏi thuộc phần thi: ${sectionType}, Mondai ${mondaiNumber}.\n\n`;

        if (passageData && passageData.text) {
            context += `[ĐOẠN VĂN]:\n${passageData.title ? passageData.title + '\n' : ''}${passageData.text}\n\n`;
        }

        context += `[CÂU HỎI ${questionData.number}]: ${questionData.instruction || ''}\n`;
        if (questionData.content) context += `Nội dung: ${questionData.content}\n`;
        if (questionData.highlight) context += `Từ cần chú ý: ${questionData.highlight}\n`;
        
        context += `\n[CÁC ĐÁP ÁN]:\n`;
        questionData.options.forEach(opt => {
            context += `${opt.id}. ${opt.text}\n`;
        });

        context += `\n[ĐÁP ÁN ĐÚNG]: ${questionData.correctAnswer}\n\n`;

        // --- BƯỚC 3: DYNAMIC PROMPT (TỐI ƯU YÊU CẦU THEO TỪNG MONDAI) ---
        let promptRequirement = `Bạn là một giáo viên luyện thi JLPT. Hãy giải thích Tập trung vào câu hỏi này, với tối đa 200 kí tự dựa trên dữ liệu trên theo yêu cầu sau:\n\n`;

        if (sectionType === 'moji_goi') {
            if (mondaiNumber == 1) {
                // Cách đọc Kanji
                promptRequirement += `1. Dịch nghĩa toàn bộ câu hỏi sang tiếng Việt.\n`;
                promptRequirement += `2. Trích xuất chữ Kanji được gạch chân/nhấn mạnh và phân tích theo đúng định dạng sau:\n`;
                promptRequirement += `   **KANJI** - Cách đọc (Hiragana) - Ý nghĩa.\n`;
                promptRequirement += `3. Giải thích tại sao chọn đáp án đúng. Nếu có lưu ý gì thêm về chữ Hán này (ví dụ: trường âm, biến âm, chữ Hán dễ nhầm lẫn), hãy nêu ra. Nếu không có thì bỏ qua.`;
            
            } else if (mondaiNumber == 2) {
                // Viết Kanji / Từ vựng
                promptRequirement += `1. Dịch nghĩa toàn bộ câu hỏi sang tiếng Việt.\n`;
                promptRequirement += `2. Dịch và phân tích cả 4 đáp án theo định dạng sau:\n`;
                promptRequirement += `   - Đáp án 1: **Từ vựng Kanji** (nếu có) - Cách đọc (Hiragana) - Ý nghĩa.\n`;
                promptRequirement += `   - Đáp án 2: **Từ vựng Kanji** (nếu có) - Cách đọc (Hiragana) - Ý nghĩa.\n`;
                promptRequirement += `   - Đáp án 3: **Từ vựng Kanji** (nếu có) - Cách đọc (Hiragana) - Ý nghĩa.\n`;
                promptRequirement += `   - Đáp án 4: **Từ vựng Kanji** (nếu có) - Cách đọc (Hiragana) - Ý nghĩa.\n`;
                promptRequirement += `3. Giải thích tại sao đáp án đúng lại phù hợp với ngữ cảnh của câu. Nêu lưu ý nếu có.`;
            
            } else if (mondaiNumber == 5) {
                // Viết Kanji / Từ vựng
                promptRequirement += `1. Phân tích từ và cách sử dụng.\n`;
                promptRequirement += `2. Dịch và phân tích cả 4 đáp án, chỉ ra lý do tại sao từ vựng này không thể sử dụng trong câu:\n`;
                promptRequirement += `3. Giải thích tại sao đáp án đúng lại phù hợp với ngữ cảnh của câu. Nêu lưu ý nếu có.`;
            } 
            
            else {
                // Các Mondai từ vựng khác (Tìm từ đồng nghĩa, Cách sử dụng từ...)
                promptRequirement += `1. Dịch nghĩa toàn bộ câu hỏi sang tiếng Việt.\n`;
                promptRequirement += `2. Dịch nghĩa 4 đáp án và phân tích sắc thái ý nghĩa/cách sử dụng của từng từ.\n`;
                promptRequirement += `3. Giải thích lý do chọn đáp án đúng và lý do các đáp án khác không phù hợp.`;
            }

        } else if (sectionType === 'bunpou') {
            // Ngữ pháp
            promptRequirement += `1. Dịch nghĩa toàn bộ câu hỏi và các đáp án sang tiếng Việt.\n`;
            promptRequirement += `2. Xác định và giải thích chi tiết điểm ngữ pháp cốt lõi xuất hiện trong câu.\n`;
            promptRequirement += `3. Phân tích tại sao đáp án đúng lại khớp về mặt cấu trúc và ngữ nghĩa. Chỉ ra lỗi sai của 3 đáp án còn lại.`;

        } else if (sectionType === 'dokkai') {
            // Đọc hiểu
            promptRequirement += `1. Dịch nghĩa câu hỏi và 4 đáp án sang tiếng Việt.\n`;
            promptRequirement += `2. Tóm tắt ngắn gọn nội dung chính của đoạn văn (hoặc dịch đoạn văn chứa manh mối).\n`;
            promptRequirement += `3. Trích dẫn câu văn/đoạn văn chứa keyword liên quan và phân tích logic để đi đến đáp án đúng. Tại sao các đáp án khác bị coi là bẫy?`;

        } else if (sectionType === 'choukai') {
            // Nghe hiểu (nếu có transcript)
            promptRequirement += `1. Dịch đoạn hội thoại/script (nếu có) và câu hỏi sang tiếng Việt.\n`;
            promptRequirement += `2. Phân tích các từ khóa quan trọng mà người nghe cần bắt được.\n`;
            promptRequirement += `3. Giải thích tại sao chọn đáp án đúng.`;
            
        } else {
            // Mặc định
            promptRequirement += `1. Dịch câu hỏi và đáp án sang tiếng Việt.\n`;
            promptRequirement += `2. Giải thích chi tiết lý do chọn đáp án đúng.`;
        }

        promptRequirement += `\n\nLƯU Ý QUAN TRỌNG: Trình bày bằng Markdown sạch sẽ, không dài dòng lặp lại đề bài. Dùng in đậm cho từ khóa.`;

        // Gộp Context và Requirement thành Prompt hoàn chỉnh
        const finalPrompt = context + promptRequirement;

        // --- BƯỚC 4: GỌI API (CÓ AUTO RETRY) ---
        const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${cleanKey}`;
        let retries = 3;      
        let delay = 2000;     

        while (retries > 0) {
            try {
                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: finalPrompt }] }]
                    })
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    const errorMsg = errorData.error?.message || response.statusText;
                    
                    if (response.status === 503 || errorMsg.toLowerCase().includes("high demand") || response.status === 429) {
                        retries--;
                        if (retries === 0) throw new Error("Hệ thống AI của Google đang quá tải. Vui lòng thử lại sau.");
                        await new Promise(resolve => setTimeout(resolve, delay));
                        delay *= 2; 
                        continue; 
                    }
                    throw new Error(`Google API: ${errorMsg}`);
                }

                const data = await response.json();
                if (data.candidates && data.candidates[0].content && data.candidates[0].content.parts) {
                    return data.candidates[0].content.parts[0].text;
                } else {
                    throw new Error("Dữ liệu từ AI không đúng cấu trúc.");
                }

            } catch (error) {
                if (retries === 0 || !error.message.includes("quá tải")) {
                    throw new Error(error.message || "Lỗi kết nối AI.");
                }
            }
        }
    }
};