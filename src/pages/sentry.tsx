import { NextPage } from "next";

import Container from "@/shared/ui/Container";
import SentryExample from "@/shared/ui/SentryExample";

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
