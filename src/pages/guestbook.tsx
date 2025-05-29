import { NextPage } from "next";
import { NextSeo } from "next-seo";

import Container from "@/common/components/elements/Container";
import PageHeading from "@/common/components/elements/PageHeading";
// import Chat from "@/modules/chat";

const PAGE_TITLE = "게스트북";
const PAGE_DESCRIPTION = "말씀하실 내용, 제안, 질문 등 무엇이든 남겨주세요!";

const GuestBookPage: NextPage = () => {
  return (
    <>
      <NextSeo title={`연철s - ${PAGE_TITLE}`} />
      <Container data-aos="fade-up">
        <PageHeading title={PAGE_TITLE} description={PAGE_DESCRIPTION} />
        {/* <Chat /> */}
      </Container>
    </>
  );
};

export default GuestBookPage;
