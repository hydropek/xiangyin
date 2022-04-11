import * as ui from '@chakra-ui/react'
import {useEffect, useState} from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import {queryPinyin, QueryResult} from './pinyin'

const reHan = /\p{Script=Han}/u
const example = `
鹊桥仙
溪邊白鷺，來吾告汝：溪裡魚兒堪數。主人憐汝汝憐魚，要物我欣然一處。
白沙遠浦，青泥別渚，剩有蝦跳鰍舞。任君飛去飽時來，看頭上風吹一縷。

鹊桥仙
纤云弄巧，飞星传恨，银汉迢迢暗度。
金风玉露一相逢，便胜却人间无数。
柔情似水，佳期如梦，忍顾鹊桥归路。
两情若是久长时，又岂在朝朝暮暮。

鵲橋仙 秦觀
纖雲弄巧，飛星傳恨，銀漢迢迢暗度。金風玉露一相逢，便勝卻人間無數。
柔情似水，佳期如夢，忍顧鵲橋歸路。兩情若是久長時，又豈在朝朝暮暮。

吉日兮辰良，穆將愉兮上皇。
撫長劍兮玉珥，璆鏘鳴兮琳琅。
`.trim()

const RubyResult: React.FC<{char: string; result: QueryResult}> = ({
  char,
  result,
}) => {
  return (
    <ruby onPointerEnter={() => {}}>
      {char}
      {result && (
        <>
          <rt>{result.join('\n')}</rt>
        </>
      )}
    </ruby>
  )
}

function Zhuyin() {
  const [words, setWords] = useState(example)
  const [result, setResult] = useState<[string, QueryResult][]>([])

  useEffect(() => {
    setResult(
      Array.from(words).map((c) => {
        return [c, reHan.test(c) ? queryPinyin(c) : void 0]
      })
    )
  }, [words])

  let dict = (
    <ui.Box
      css={{
        ruby: {
          margin: '0 2px',
        },
      }}
    >
      <ui.Textarea
        as={TextareaAutosize}
        size="md"
        placeholder="请输入字词"
        rows={10}
        maxRows={20}
        value={words}
        onChange={(e) => setWords(e.target.value)}
      />
      <ui.Divider my="4" />
      <ui.Text whiteSpace="pre-wrap" fontSize="2xl" lineHeight={1.8}>
        {result.map(([char, result], i) =>
          result ? <RubyResult key={i} char={char} result={result} /> : char
        )}
      </ui.Text>
    </ui.Box>
  )

  return (
    <ui.Container maxW="6xl" px="1">
      <ui.Box pt="4">
        <ui.Tabs isLazy defaultIndex={0} variant="soft-rounded">
          <ui.TabList>
            <ui.Tab>注音</ui.Tab>
            <ui.Tab>音节表</ui.Tab>
          </ui.TabList>
          <ui.TabPanels>
            <ui.TabPanel>{dict}</ui.TabPanel>
            <ui.TabPanel>TODO</ui.TabPanel>
          </ui.TabPanels>
        </ui.Tabs>
      </ui.Box>
    </ui.Container>
  )
}

export default Zhuyin
