import axios from "axios";
import clsx from "clsx";
import { useState } from "react";
import { FiClock as ClockIcon } from "react-icons/fi";

import Button from "@/common/components/elements/Button";

interface FormDataProps {
  subject: string;
  content: string;
}

const formInitialState: FormDataProps = {
  subject: "",
  content: "",
};

const ContactForm = () => {
  const [formData, setFormData] = useState<FormDataProps>(formInitialState);

  const [formErrors, setFormErrors] = useState<Partial<FormDataProps>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    setFormErrors({
      ...formErrors,
      [name]: value ? undefined : `${name} is required`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const hasErrors = Object.values(formErrors).some((error) => error);

    if (!hasErrors) {
      setIsLoading(true);
      try {
        const response = await axios.post("/api/contact", { formData });
        if (response.status === 200) {
          alert("메시지가 발송되었습니다.");
          setFormData(formInitialState);
        }
      } catch (error) {
        alert(error);
      }
      setIsLoading(false);
    } else {
      alert("Error!");
    }
  };

  const isSubmitDisabled = Object.values(formErrors).some((error) => error);

  return (
    <form onSubmit={handleSubmit}>
      <div className="flex flex-grow flex-col gap-5">
        <div className="flex flex-col gap-5 md:flex-row">
          <input
            className="w-full rounded-md border border-neutral-200 px-3 py-2 focus:outline-none dark:border-neutral-700"
            type="text"
            placeholder="제목을 입력해주세요"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            required
          />
        </div>
        <textarea
          className="w-full rounded-md border border-neutral-200 px-3 py-2 focus:outline-none dark:border-neutral-700"
          rows={5}
          placeholder="내용을 입력해주세요"
          name="content"
          value={formData.content}
          onChange={handleChange}
          required
        />
        <Button
          className={clsx(
            "flex justify-center bg-neutral-800 py-2.5 hover:scale-[101%] hover:bg-neutral-900 dark:bg-neutral-50 dark:text-neutral-950 hover:dark:bg-neutral-50",
          )}
          type="submit"
          icon={<></>}
          data-umami-event="Send Contact Message"
          disabled={isSubmitDisabled}
        >
          {isLoading ? "메일 발송중.." : "메일 발송하기"}
        </Button>
      </div>

      <div className="my-5 flex items-center gap-2 dark:text-neutral-400">
        <ClockIcon />
        <div className="text-sm">
          <span className="font-medium">Avg. response:</span> 1-2 Hours (Working
          Hours, GMT+7)
        </div>
      </div>
    </form>
  );
};

export default ContactForm;
