import { formatInvitedOn } from '../../../utils/jeeMockTestResultFormat';

export default function StudentIdentity({ name, invitedOn }) {
  return (
    <section className="jee-report-in pt-3">
      <p className="text-[11px] font-semibold tracking-[0.14em] text-[#69798A]">
        JEE MAIN MOCK TEST <span className="text-[#16A36A]">/ ATTEMPTED</span>
      </p>
      <h1 className="font-sw-display mt-1.5 text-[1.7rem] leading-[1.15] font-semibold tracking-[-0.03em] text-[#102A3D] sm:text-[2rem]">
        {name || 'Not available'}
      </h1>
      <p className="mt-1 text-sm text-[#69798A]">Invited on {formatInvitedOn(invitedOn)}</p>
    </section>
  );
}
