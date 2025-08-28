import { NextPage } from "next";
import { NextSeo } from "next-seo";
import { useState } from "react";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
import GuestbookForm from "@/modules/guestbook/components/GuestbookForm";
import GuestbookList from "@/modules/guestbook/components/GuestbookList";

const PAGE_TITLE = "게스트북";
const PAGE_DESCRIPTION = "말씀하실 내용, 제안, 질문 등 무엇이든 남겨주세요!";

const GuestBookPage: NextPage = () => {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleFormSuccess = () => {
    // 폼 제출 성공 시 리스트 새로고침
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <>
      <NextSeo
        title={`연철s - ${PAGE_TITLE}`}
        description={PAGE_DESCRIPTION}
        openGraph={{
          title: `${PAGE_TITLE} - 연철s`,
          description: PAGE_DESCRIPTION,
        }}
      />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />

        <div className="max-w-4xl mx-auto">
          <GuestbookForm onSuccess={handleFormSuccess} />
          <GuestbookList refreshTrigger={refreshTrigger} />
        </div>
      </Container>
    </>
  );
};

export default GuestBookPage;
