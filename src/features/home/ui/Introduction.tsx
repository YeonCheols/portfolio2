const Introduction = () => {
  return (
    <section className="bg-cover bg-no-repeat ">
      <div className="space-y-3">
        <div className="flex gap-2  text-2xl font-medium lg:text-3xl">
          <h1>안녕하세요, 프론트엔드 개발자 성연철입니다</h1>{" "}
          <div className="ml-1 animate-waving-hand">👋</div>
        </div>
      </div>

      <p className="mt-6 leading-[1.8] text-neutral-800 dark:text-neutral-300 md:leading-loose">
        누구나 자유롭게 개발을 이어갈 수 있는 환경을 좋아합니다. 동료들과 새로운
        기술에 관해서 이야기 하는 것을 좋아하고 내 코드에 대한 리뷰를 받는
        과정을 좋아합니다. 명확한 의도가 드러나고, 알기 쉬운 코드를 작성하기
        위해 끊임없이 고민하고 노력합니다.
      </p>
    </section>
  );
};

export default Introduction;
