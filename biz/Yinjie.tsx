import * as ui from '@chakra-ui/react'
import {useBoolean} from '@chakra-ui/react'
import groupBy from 'lodash/groupBy'
import mapValues from 'lodash/mapValues'
import sortBy from 'lodash/sortBy'
import {useContext, useEffect, useMemo} from 'react'
import {createJyinEntry} from '~/data/jyin'
import {JyinEntry} from '~/data/types'
import * as hsn from '~/data/长沙话音档.meta'
import {canPlay, canPlayJyinEntry, items, playAudio} from './play'
import {StyledPopover, VolumeIcon} from './shared'
import {ZhuyinSettingsContext} from './ZhuyinMenu'

const fontSize = '1.1em'
const initials = sortBy(Object.values(hsn.Initials), (x) => (x === '' ? 0 : 1))
const finals = Object.values(hsn.Finals)

const itemsBySyllable = mapValues(
  groupBy(items, (x) => x.读.IPA.音),
  (x) => sortBy(x, (x) => x.调.调序)
)

const StackedSyllables: React.FC<{
  group: JyinEntry[]
  shouldPlayOnHover: boolean
}> = ({group, shouldPlayOnHover}) => {
  const groupedByTone = useMemo(
    () => Object.entries(groupBy(group, (x) => x.调.调序)),
    [group]
  )
  const {toneType, pinyinType} = useContext(ZhuyinSettingsContext)
  return (
    <ui.HStack spacing={1} alignItems="flex-start">
      {groupedByTone.map(([t, x], i) => (
        <ui.Box
          key={i}
          // 让比较长的六个音不溢出，如 tɕiəu1~6，默认宽 318px
          width={1 / 6}
          textAlign="center"
          cursor="pointer"
          onPointerDown={() => {
            playAudio(x[0].读.toIPA())
          }}
          onPointerEnter={() => {
            if (shouldPlayOnHover) {
              playAudio(x[0].读.toIPA())
            }
          }}
          textDecorationLine={
            canPlayJyinEntry(x[0]) ? 'line-through' : 'inherit'
          }
          color={canPlayJyinEntry(x[0]) ? 'gray' : 'inherit'}
          css={{svg: {display: 'inline'}}}
        >
          <ui.Box
            mt="1"
            css={{
              fontSize,
              rt: {fontSize: 'inherit'},
            }}
          >
            <ruby>
              {/* TODO: {x.map((x) => x.字)} */}
              {x[0].字 || <>&nbsp;</>}
              <rt>{x[0].读.format(pinyinType, toneType)}</rt>
            </ruby>
          </ui.Box>
          {canPlay(x[0].读.toIPA()) && <VolumeIcon size=".9em" />}
        </ui.Box>
      ))}
    </ui.HStack>
  )
}

const queueTask = (callback: () => void) => {
  const {port1, port2} = new MessageChannel()
  port2.onmessage = () => callback()
  port1.postMessage('')
  port1.close()
}

const postPaint = (fn: () => void) => {
  const rafId = requestAnimationFrame(() => queueTask(fn))
  return () => {
    cancelAnimationFrame(rafId)
  }
}

const rIC =
  typeof requestIdleCallback !== 'undefined' ? requestIdleCallback : postPaint

const PinyinCell: React.FC<{
  initial: hsn.Initial
  final: hsn.Final
  shouldPlayOnHover: boolean
  shouldCompact: boolean
}> = ({initial, final, shouldCompact, shouldPlayOnHover}) => {
  const {toneType, pinyinType} = useContext(ZhuyinSettingsContext)
  // NOTE: Popover 大批量渲染时有性能问题，让它推迟初始化
  const [shouldRenderPopover, shouldRenderPopoverFlag] = useBoolean()
  // TODO: 在长沙话音档中替换
  const syllable = initial + final
  const senyn = useMemo(
    () => createJyinEntry(initial, final, 1, '').读[pinyinType].音,
    [final, initial, pinyinType]
  )
  const group = itemsBySyllable[syllable]

  useEffect(() => {
    rIC(() => shouldRenderPopoverFlag.on())
  }, [shouldRenderPopoverFlag])

  // 外漏的项目找第一个能播放的（popover 中显示全部）
  const item = useMemo(() => group?.find((x) => canPlay(x.读.toIPA())), [group])
  // const item = useMemo(() => group?.find((x) => x.號), [group])
  const playableCell = item && (
    <ui.Box
      cursor="pointer"
      onPointerDown={() => {
        playAudio(item.读.toIPA())
      }}
      // 因 touch 设备触发时机的不同，让播放行为一致
      onPointerEnter={() => {
        // 在交互时初始化不太可靠，移动迅速时有些没有关闭
        // setTimeout(shouldRenderPopoverFlag.on)
        if (shouldPlayOnHover) {
          playAudio(item.读.toIPA())
        }
      }}
      css={{
        rt: {fontSize: 'inherit'},
        svg: {display: 'inline'},
      }}
    >
      <ui.Box>
        <ruby>
          {shouldCompact ? '' : item.字 ?? '?'}
          <rt>{senyn}</rt>
        </ruby>
      </ui.Box>
      <VolumeIcon size=".9em" />
    </ui.Box>
  )

  return (
    <ui.Td>
      {item && shouldRenderPopover ? (
        <StyledPopover
          // defaultIsOpen
          triggerContent={playableCell}
          header="可用音节"
          openDelay={100}
        >
          <StackedSyllables
            group={group}
            shouldPlayOnHover={shouldPlayOnHover}
          />
        </StyledPopover>
      ) : (
        playableCell
      )}
    </ui.Td>
  )
}

const PinyinTable = () => {
  const [shouldCompact, shouldCompactFlag] = useBoolean(true)
  const [shouldPlayOnHover, shouldPlayOnHoverFlag] = useBoolean(true)
  const {colorMode} = ui.useColorMode()
  const thBg = colorMode === 'dark' ? 'gray.800' : 'white'

  return (
    <ui.Box>
      <ui.FormControl display="flex" alignItems="center">
        <ui.FormLabel htmlFor="shouldPlayOnHoverFlag" mb={0} mr={1}>
          悬停播放
        </ui.FormLabel>
        <ui.Switch
          id="shouldPlayOnHoverFlag"
          isChecked={shouldPlayOnHover}
          onChange={shouldPlayOnHoverFlag.toggle}
        />
        <ui.FormLabel htmlFor="shouldCompactFlag" mb={0} mr={1} ml={4}>
          紧凑显示
        </ui.FormLabel>
        <ui.Switch
          id="shouldCompactFlag"
          isChecked={shouldCompact}
          onChange={shouldCompactFlag.toggle}
        />
      </ui.FormControl>
      {/* <ui.Text my="4">老派长沙方言中声母有 23 个，韵母 41 个。</ui.Text> */}
      <ui.TableContainer
        sx={{
          // overflow 与 sticky 冲突，因此在 48em+ 时不使用 overflow，让 sticky 生效
          overflowX: ['auto', 'auto', 'visible'],
          overflowY: 'visible',
        }}
      >
        <ui.Table
          size="md"
          variant="simple"
          sx={{
            th: {
              textTransform: 'none',
              padding: '5px',
              fontFamily: 'ipa',
              fontSize,
            },
            td: {
              padding: '5px 3px 2px',
            },
            'th, td': {
              border: `var(--chakra-borders-1px) var(--chakra-colors-cyan-100)`,
              textAlign: 'center',
            },
            ruby: {margin: 0},
          }}
        >
          <ui.TableCaption placement="top">
            表格用字来自《长沙话音档》（1997），读音取自
            <ui.Link
              isExternal
              href="http://humanum.arts.cuhk.edu.hk/Lexis/lexi-mf/"
            >
              汉语多功能字库
            </ui.Link>
            ，属老派长沙话，其中声母共 23 个，韵母共 41 个。⚠️
            灰色删除线标记的为错误或不准确读音。
          </ui.TableCaption>
          <ui.Thead
            sx={{
              th: {
                position: 'sticky',
                top: 0,
                bg: thBg,
              },
            }}
          >
            <ui.Tr>
              <ui.Th>{''}</ui.Th>
              {initials.map((x) => (
                <ui.Th key={x}>{x === '' ? '∅' : x}</ui.Th>
              ))}
            </ui.Tr>
          </ui.Thead>
          <ui.Tbody
            sx={{
              th: {
                position: 'sticky',
                left: 0,
                bg: thBg,
              },
            }}
          >
            {finals.map((y) => (
              <ui.Tr key={y}>
                <ui.Th>{y}</ui.Th>
                {initials.map((x) => (
                  <PinyinCell
                    key={x + y}
                    initial={x}
                    final={y}
                    shouldCompact={shouldCompact}
                    shouldPlayOnHover={shouldPlayOnHover}
                  />
                ))}
              </ui.Tr>
            ))}
          </ui.Tbody>
        </ui.Table>
      </ui.TableContainer>
    </ui.Box>
  )
}

export default PinyinTable
