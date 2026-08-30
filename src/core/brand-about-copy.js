export const FINAL_ABOUT_INTRO = "세계적으로 유명한 배우들도 끊임없이 훈련합니다.";
export const FINAL_ABOUT_BODY = `작품을 쉬는 기간에는 발성과 호흡,
감정을 전달하는 방법을 배우고 다듬습니다.

작품 중에도 필요한 순간마다
조언을 구하며 자신을 정비합니다.

정치도 다르지 않다고 생각합니다.

정참시는
정치를 하려는 곳도,
정치인이 되려는 곳도 아닙니다.

다만 현장에서 더 나은 방법이 필요할 때,
현장의 시각과는 다른 방향에서 해답을 찾고자 할 때,
의도와는 다르게 난처한 상황을 겪게 될 때,
정참시는 분명한 데이터를 기반으로 더 선명한 방법을 제공합니다.

정참시는 정참시가 가장 잘하는 일을 하겠습니다.

막대한 양의 데이터를 빠짐없이 수집하고,
JCS만의 독자적인 시스템을 통해 분석하고,
시장이 요구하는 신호를 읽어
가장 필요한 순간에 전달하겠습니다.

그다음은 여러분의 몫입니다.
시장을 향해 마음껏 목소리를 내십시오.

목적지를 정하는 것은 여러분입니다.
가장 정확한 길을 찾는 것은 정참시가 하겠습니다.`;
const LEGACY_MARKERS=["정치는 선거일 하루에만 존재하지 않습니다","정참시는 정치인을 지지하거나 공격하기 위해 만든 곳이 아닙니다"];
export function normalizeAboutCopy(about={}){
  const body=String(about?.body||"");
  const legacy=!body||LEGACY_MARKERS.some(marker=>body.includes(marker));
  return legacy?{...about,title:"왜 정참시인가",intro:FINAL_ABOUT_INTRO,body:FINAL_ABOUT_BODY}:about;
}
