(() => {
  const apiUrl = "/admin/ai-models/api/settings";
  const form = document.querySelector("#setting-form");
  const statusMessage = document.querySelector("#status-message");
  const formTitle = document.querySelector("#form-title");
  const settingId = document.querySelector("#setting-id");
  const environment = document.querySelector("#environment");
  const provider = document.querySelector("#provider");
  const modelName = document.querySelector("#model-name");
  const modelUrl = document.querySelector("#model-url");
  const secretRef = document.querySelector("#secret-ref");
  const saveButton = document.querySelector("#save-setting");
  const cancelEditButton = document.querySelector("#cancel-edit");

  const showMessage = (message, isError = false) => {
    statusMessage.textContent = message;
    statusMessage.classList.remove("hidden");
    statusMessage.classList.toggle("border-red-200", isError);
    statusMessage.classList.toggle("bg-red-50", isError);
    statusMessage.classList.toggle("text-red-800", isError);
    statusMessage.classList.toggle("border-green-200", !isError);
    statusMessage.classList.toggle("bg-green-50", !isError);
    statusMessage.classList.toggle("text-green-800", !isError);
  };

  const request = async (path, options = {}) => {
    const response = await window.fetch(path, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "content-type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (response.status === 401) {
      window.location.assign(
        new URL("/admin/ai-models/connect", window.location.origin).toString(),
      );
      throw new Error("세션이 만료되었습니다. 다시 로그인해 주세요.");
    }
    if (!response.ok)
      throw new Error("요청을 처리하지 못했습니다. 다시 시도해 주세요.");
    if (response.status === 204) return null;
    return response.json();
  };

  const makeButton = (label, action, setting, extraClass = "") => {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.action = action;
    button.dataset.settingId = String(setting.id);
    button.className = `rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 ${extraClass}`;
    return button;
  };

  const renderSetting = (setting) => {
    const card = document.createElement("article");
    card.className = "rounded-xl border border-slate-200 bg-slate-50 p-4";

    const heading = document.createElement("div");
    heading.className = "flex flex-wrap items-center justify-between gap-2";
    const name = document.createElement("h3");
    name.className = "break-all text-sm font-bold";
    name.textContent = setting.modelName;
    const state = document.createElement("span");
    state.className = setting.isActive
      ? "rounded-full bg-green-100 px-2.5 py-1 text-xs font-bold text-green-800"
      : "rounded-full bg-slate-200 px-2.5 py-1 text-xs font-bold text-slate-700";
    state.textContent = setting.isActive ? "활성" : "비활성";
    heading.append(name, state);

    const details = document.createElement("dl");
    details.className = "mt-3 space-y-1 break-all text-xs text-slate-600";
    const providerRow = document.createElement("div");
    providerRow.textContent = `공급자: ${setting.provider}`;
    const secretRow = document.createElement("div");
    secretRow.textContent = `시크릿 참조: ${setting.secretRef}`;
    details.append(providerRow, secretRow);

    const actions = document.createElement("div");
    actions.className = "mt-4 flex flex-wrap gap-2";
    if (!setting.isActive) {
      actions.append(
        makeButton(
          "활성화",
          "activate",
          setting,
          "border-blue-200 text-blue-700",
        ),
        makeButton("수정", "edit", setting),
        makeButton("삭제", "delete", setting, "border-red-200 text-red-700"),
      );
    } else {
      const activeLabel = document.createElement("span");
      activeLabel.className = "text-xs font-semibold text-green-800";
      activeLabel.textContent = "현재 환경에서 사용 중인 설정입니다.";
      actions.append(activeLabel);
    }
    card.append(heading, details, actions);
    return card;
  };

  const loadSettings = async () => {
    const lists = {
      development: document.querySelector('[data-settings-list="development"]'),
      production: document.querySelector('[data-settings-list="production"]'),
    };
    Object.values(lists).forEach((list) => {
      list.replaceChildren();
      const loading = document.createElement("p");
      loading.className = "text-sm text-slate-500";
      loading.textContent = "설정을 불러오는 중입니다.";
      list.append(loading);
    });

    try {
      const settings = await request(apiUrl, { method: "GET" });
      if (!Array.isArray(settings))
        throw new Error("설정 목록 형식이 올바르지 않습니다.");
      Object.values(lists).forEach((list) => list.replaceChildren());
      for (const [environmentName, list] of Object.entries(lists)) {
        const matching = settings.filter(
          (setting) => setting.environment === environmentName,
        );
        if (matching.length === 0) {
          const empty = document.createElement("p");
          empty.className = "text-sm text-slate-500";
          empty.textContent = "등록된 설정이 없습니다.";
          list.append(empty);
        } else {
          matching.forEach((setting) => list.append(renderSetting(setting)));
        }
      }
      return settings;
    } catch (error) {
      Object.values(lists).forEach((list) => list.replaceChildren());
      showMessage(error.message || "설정을 불러오지 못했습니다.", true);
      return null;
    }
  };

  const resetForm = () => {
    form.reset();
    settingId.value = "";
    environment.disabled = false;
    modelUrl.value = "https://openrouter.ai/api/v1/chat/completions";
    formTitle.textContent = "모델 설정 추가";
    saveButton.textContent = "설정 저장";
    cancelEditButton.classList.add("hidden");
  };

  const editSetting = (setting) => {
    settingId.value = String(setting.id);
    environment.value = setting.environment;
    environment.disabled = true;
    provider.value = setting.provider;
    modelName.value = setting.modelName;
    modelUrl.value = setting.url;
    secretRef.value = setting.secretRef;
    formTitle.textContent = "모델 설정 수정";
    saveButton.textContent = "변경 저장";
    cancelEditButton.classList.remove("hidden");
    form.scrollIntoView({ behavior: "smooth", block: "start" });
    modelName.focus();
  };

  document
    .querySelector("#model-settings")
    .addEventListener("click", async (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) return;
      const id = button.dataset.settingId;
      const action = button.dataset.action;
      try {
        if (action === "edit") {
          const settings = await request(apiUrl, { method: "GET" });
          const setting = settings.find((item) => String(item.id) === id);
          if (setting) editSetting(setting);
          return;
        }
        if (
          action === "delete" &&
          !window.confirm("이 비활성 설정을 삭제할까요?")
        )
          return;
        if (action === "activate") {
          await request(`${apiUrl}/${id}/activate`, { method: "POST" });
          showMessage("모델 설정을 활성화했습니다.");
        } else if (action === "delete") {
          await request(`${apiUrl}/${id}`, { method: "DELETE" });
          showMessage("모델 설정을 삭제했습니다.");
        }
        await loadSettings();
      } catch (error) {
        showMessage(error.message || "요청을 처리하지 못했습니다.", true);
      }
    });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const id = settingId.value;
    const payload = {
      environment: environment.value,
      provider: provider.value,
      modelName: modelName.value.trim(),
      url: modelUrl.value.trim(),
      secretRef: secretRef.value.trim(),
    };
    saveButton.disabled = true;
    try {
      await request(id ? `${apiUrl}/${id}` : apiUrl, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload),
      });
      resetForm();
      showMessage(
        id ? "모델 설정을 수정했습니다." : "모델 설정을 추가했습니다.",
      );
      await loadSettings();
    } catch (error) {
      showMessage(error.message || "설정을 저장하지 못했습니다.", true);
    } finally {
      saveButton.disabled = false;
    }
  });

  cancelEditButton.addEventListener("click", resetForm);
  document
    .querySelector("#reload-settings")
    .addEventListener("click", loadSettings);
  loadSettings();
})();
