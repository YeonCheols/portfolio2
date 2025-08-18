import { NextPage } from "next";

import Container from "@/common/components/elements/Container";
import SentryExample from "@/common/components/elements/SentryExample";

const SentryPage: NextPage = () => {
  return (
    <>
      <Container data-aos="fade-up">
        <SentryExample />
      </Container>
    </>
  );
};

export default SentryPage;
