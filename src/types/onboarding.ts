type RiskAnswer = {
  questionId: string
  selectedOption: number
}

type RiskQuestion = {
  id: string
  text: string
  options: {
    label: string
    score: number
  }[]
}

export type {
  RiskAnswer,
  RiskQuestion,
}
