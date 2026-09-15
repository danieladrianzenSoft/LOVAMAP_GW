import React from 'react';

interface InstitutionalBannerProps {
	size?: 'default' | 'small';
}

const InstitutionalBanner: React.FC<InstitutionalBannerProps> = ({ size = 'default' }) => {
	const isSmall = size === 'small';

	return (
		<div className="w-full bg-[#061957]">
			<div className={`flex items-center justify-between px-8 ${isSmall ? 'py-2' : 'py-2.5'}`}>
				<img
					src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/Duke_Pratt_School_of_Engineering_logo_WHITE_fnt3om"
					alt="Duke Pratt School of Engineering"
					className={isSmall ? 'h-[18px] md:h-6 w-auto' : 'h-5 md:h-7 w-auto'}
				/>
				<div className="flex items-center gap-2">
					<img
						src="https://res.cloudinary.com/danmkw7ni/image/upload/f_auto,q_auto/MIMC_logo_WHITE_o7gbjl"
						alt="Materials in Medicine Center"
						className={isSmall ? 'h-7 md:h-9 w-auto' : 'h-8 md:h-11 w-auto'}
					/>
					<div className="text-white" style={{ fontFamily: "'Barlow', sans-serif", lineHeight: '1.1' }}>
						<div className={`font-medium tracking-wide uppercase ${isSmall ? 'text-[12px] md:text-[14px]' : 'text-[13px] md:text-[15px]'}`}>Materials in</div>
						<div className={`font-medium tracking-wide uppercase ${isSmall ? 'text-[12px] md:text-[14px]' : 'text-[13px] md:text-[15px]'}`}>Medicine Center</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default InstitutionalBanner;
