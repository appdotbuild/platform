import { Link } from '@tanstack/react-router';
import bgPattern1 from '~/components/assets/svgs/bg-pattern-1.svg';
import bgPattern2 from '~/components/assets/svgs/bg-pattern-2.svg';
import bgPattern3 from '~/components/assets/svgs/bg-pattern-3.svg';
import bgPattern4 from '~/components/assets/svgs/bg-pattern-4.svg';
import createLogo from '~/components/assets/svgs/create-logo-light.svg';
import replitLogo from '~/components/assets/svgs/replit-logo-light.svg';
import sameLogo from '~/components/assets/svgs/same-logo-light.svg';
import v0Logo from '~/components/assets/svgs/v0-logo-light.svg';
import { ChatInput } from '~/components/chat/chat-input';
import {
  DecoratedInputContainer,
  DecorationPlus,
  DecorationSquare,
} from '~/components/shared/decorations';
import { GithubIcon } from '~/components/shared/icons/github-icon';
import { HeroTitle } from '~/components/shared/title';

export function PublicHome() {
  return (
    <section
      data-testid="public-home"
      className="hero relative grow overflow-hidden"
    >
      <div className="relative mx-auto flex w-full max-w-[1216px] flex-col px-5 pb-28 pt-[125px] md:px-8 md:pb-40 md:pt-[138px] lg:pb-44 lg:pt-[152px] xl:max-w-[1280px] xl:px-8 xl:pb-48 xl:pt-[156px]">
        <div className="relative md:mx-auto md:max-w-[514px] md:px-0 lg:max-w-[640px]">
          <HeroTitle className="md:max-w-[448px] lg:max-w-[578px]">
            An open-source <br className="block md:hidden xl:block" />
            AI agent that builds <br className="block md:hidden xl:block" />
            full-stack apps
          </HeroTitle>
          <div className="relative mt-10 pb-5 md:mt-12 md:pb-6 lg:mt-14 lg:pb-7 xl:mt-16 xl:pb-8">
            <DecoratedInputContainer className="relative">
              <ChatInput />
              <DecorationSquare className="absolute -bottom-0.5 -left-24 z-10 md:-left-16 lg:-left-24" />
              <DecorationSquare className="absolute -right-24 -top-0.5 z-10 md:-right-16 lg:-right-24" />
            </DecoratedInputContainer>

            <p className="text-hero-paragraph mt-20 px-5 font-mono text-foreground md:mt-32 md:px-8 lg:mt-[135px] lg:px-8 lg:text-left xl:mt-20">
              <span className="bg-primary pb-px text-white md:pb-1">
                app.build
              </span>{' '}
              creates real apps from scratch on top of the{' '}
              <Link to="http://neon.com" target="_blank" className="underline">
                Neon
              </Link>{' '}
              platform. By default, generated apps use Neon Postgres, Neon Auth
              and other incoming Neon features (but you can also bring your own
              templates).
            </p>

            <p className="text-hero-paragraph mt-6 px-5 font-mono text-foreground md:px-8 lg:px-8 lg:text-left">
              It is fully open source, local-first, and built for developers. It
              serves as a reference implementation for any codegen product
              looking to build on top of Neon.
            </p>

            <p className="text-hero-paragraph mt-6 px-5 font-mono text-foreground md:px-8 lg:px-8 lg:text-left">
              Learn more in our{' '}
              <Link
                to="/blog/app-build-open-source-ai-agent"
                className="underline"
              >
                launch blog post
              </Link>{' '}
              and{' '}
              <Link
                to="https://neon.com/docs/ai/ai-app-build"
                className="underline"
              >
                in our docs
              </Link>
              .
            </p>

            <div className="mt-8 flex flex-col items-center gap-x-6 gap-y-2.5 px-5 md:mt-6 md:flex-row md:px-8 lg:mt-10 lg:px-8">
              <Link
                to="https://github.com/appdotbuild/agent"
                target="_blank"
                className="relative inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-[rgba(113,113,122,0.16)] hover:bg-[rgba(113,113,122,0.32)] active:bg-[rgba(113,113,122,0.40)] h-10 px-4 lg:px-3.5 text-[14px] lg:text-[16px] w-full gap-x-1.5 md:w-auto z-20 hover:text-black/80 leading-snug"
                style={{ letterSpacing: '-0.35px', color: 'rgb(9, 9, 11)' }}
              >
                <GithubIcon className="size-3.5 lg:size-4" aria-hidden />
                Agent Code
              </Link>
              <Link
                to="https://github.com/appdotbuild/platform"
                target="_blank"
                className="relative inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 bg-[rgba(113,113,122,0.16)] hover:bg-[rgba(113,113,122,0.32)] active:bg-[rgba(113,113,122,0.40)] h-10 px-4 lg:px-3.5 text-[14px] lg:text-[16px] w-full gap-x-1.5 md:w-auto z-20 hover:text-black/80 leading-snug"
                style={{ letterSpacing: '-0.35px', color: 'rgb(9, 9, 11)' }}
              >
                <GithubIcon className="size-3.5 lg:size-4" aria-hidden />
                Platform Code
              </Link>
            </div>

            <div className="mt-16 flex flex-wrap gap-x-5 gap-y-4 px-5 font-mono text-hero-paragraph md:items-center md:px-8 lg:px-8 lg:text-left">
              <p className="text-hero-paragraph opacity-70 lg:text-left">
                Inspired by:
              </p>
              <div className="flex items-center gap-x-6">
                <Link to="https://v0.dev" target="_blank">
                  <span className="sr-only">V0 dev link</span>
                  <img
                    className="h-7 w-auto md:h-8"
                    src={v0Logo}
                    alt="v0 Logo"
                    width={56}
                    height={32}
                  />
                </Link>

                <Link to="https://create.xyz" target="_blank">
                  <span className="sr-only">create.xyz link</span>
                  <img
                    className="h-7 w-auto md:h-8"
                    src={createLogo}
                    alt="Create.xyz logo"
                    width={111}
                    height={28}
                  />
                </Link>

                <Link to="https://replit.com" target="_blank">
                  <span className="sr-only">Replit link</span>
                  <img
                    className="h-7 w-auto md:h-8"
                    src={replitLogo}
                    alt="Replit logo"
                    width={112}
                    height={26}
                  />
                </Link>

                <Link to="https://same.new" target="_blank">
                  <span className="sr-only">same.new link</span>
                  <img
                    className="h-7 w-auto md:h-8"
                    src={sameLogo}
                    alt="Same.new logo"
                    width={32}
                    height={32}
                  />
                </Link>
              </div>
            </div>

            <span
              className="absolute -left-24 top-0 h-full w-px border-l border-dashed border-black/20 md:-left-16 lg:-left-24"
              aria-hidden
            />
            <span
              className="absolute -right-24 top-0 h-full w-px border-r border-dashed border-black/20 md:-right-16 lg:-right-24"
              aria-hidden
            />
            <span
              className="absolute left-0 top-0 h-full w-px border-l border-dashed border-black/20"
              aria-hidden
            />
            <span
              className="absolute right-0 top-0 h-full w-px border-r border-dashed border-black/20"
              aria-hidden
            />

            <img
              className="absolute -bottom-16 -right-24 object-cover md:bottom-0 md:h-96 lg:-bottom-3.5 lg:h-auto xl:bottom-0"
              src={bgPattern1}
              width={94}
              height={416}
              alt=""
            />
            <img
              className="absolute -left-full top-0 object-cover md:h-16 lg:h-auto"
              src={bgPattern2}
              width={544}
              height={83}
              alt=""
            />
          </div>
        </div>

        <div className="relative w-full">
          <div className="pointer-events-none relative max-w-full select-none py-4 md:mx-auto md:max-w-[640px] md:py-0 lg:max-w-[832px]">
            <span
              className="absolute left-1/2 top-0 -ml-[50vw] h-px w-screen bg-black/15"
              aria-hidden
            />
            <span
              className="absolute bottom-0 left-1/2 -ml-[50vw] h-px w-screen bg-black/15"
              aria-hidden
            />
            <span
              className="absolute -left-60 top-0 h-full w-px border-l border-dashed border-black/20"
              aria-hidden
            />
            <span
              className="absolute -right-32 top-0 h-full w-px border-r border-dashed border-black/20"
              aria-hidden
            />
            <span
              className="absolute -left-[100vw] bottom-44 h-px w-screen border-t border-dashed border-black/20"
              aria-hidden
            />
            <span
              className="absolute -right-[100vw] bottom-56 h-px w-screen border-t border-dashed border-black/20"
              aria-hidden
            />
            <span
              className="absolute -right-[100vw] bottom-80 h-px w-screen border-t border-dashed border-black/20"
              aria-hidden
            />

            <DecorationPlus className="absolute -left-60 bottom-44 z-10" />
            <DecorationPlus className="absolute -right-32 bottom-80 z-10" />
            <DecorationSquare className="absolute -bottom-0.5 -left-60 z-10" />

            <img
              className="absolute -right-[86%] bottom-56 object-cover lg:-right-[66%]"
              src={bgPattern3}
              width={419}
              height={104}
              alt=""
            />
            <img
              className="absolute -left-[544px] bottom-px h-44 object-cover"
              src={bgPattern4}
              width={304}
              height={159}
              alt=""
            />
          </div>
        </div>
      </div>
    </section>
  );
}
